import { AuthUser } from "./auth-core";
import { ApiError } from "./http";
import { prisma } from "./prisma";
import { aiTools, dashboards } from "./services";

const POLICY = `
HCM Lite policy:
- Office start 09:00, grace 15 minutes, late after 09:15 unless settings changed.
- Half day if worked under 5 hours. Weekend Sat-Sun unless settings changed.
- Leave quotas: Annual 14, Sick 8, Casual 10, Unpaid unlimited. Working days only (skip weekends and holidays). Overlap or over-balance is rejected.
- Payroll: Gross = 1.5 × basic (HRA 40%, medical 10%). Per day = gross ÷ working days. Deduct absent + unpaid + 0.5 × half days. Tax slabs on annual gross: 0 to 600k; 5% to 1.2M; 30k+15% to 2.4M; 210k+25% to 3.6M; 510k+35% above. Only Admin finalizes payroll; finalized months are locked.
- Employees cannot see other people's salary or data. Never reveal another employee's salary.
Answer only from tools or this policy. If unknown, say you do not know.
`;

const tools = [
  { type: "function", function: { name: "get_headcount", description: "Active employee count, optionally by department", parameters: { type: "object", properties: { department: { type: "string" } } } } },
  { type: "function", function: { name: "get_attendance_summary", description: "Attendance KPIs", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_late_comers", description: "Top late-comers", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_leave_summary", description: "Approved leave by type", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_my_leave_balance", description: "Current user's leave balances", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_payroll_summary", description: "Payroll cost summary", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "search_employees", description: "Search employees by name/code/email", parameters: { type: "object", properties: { q: { type: "string" } } } } },
];

async function callLLM(messages: unknown[], withTools = true) {
  const key = process.env.AI_API_KEY;
  if (!key) throw new ApiError(503, "AI is not configured. Set AI_API_KEY on the server.");
  const base = (process.env.AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "llama-3.3-70b-versatile";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        ...(withTools ? { tools, tool_choice: "auto" } : {}),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(502, `AI provider error: ${text.slice(0, 200)}`);
    }
    return res.json();
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ApiError(504, "The assistant timed out. Try again.");
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

async function rateLimit(userId: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.aiLog.count({ where: { userId, createdAt: { gte: since } } });
  if (count >= 20) throw new ApiError(429, "Hourly assistant limit reached (20). Try later.");
}

export async function chatAssistant(user: AuthUser, message: string) {
  await rateLimit(user.id);
  const fns = await aiTools(user);
  const messages: Record<string, unknown>[] = [
    {
      role: "system",
      content: `${POLICY}\nYou are the HCM Lite assistant for a ${user.role}. Scope: ${user.role === "EMPLOYEE" ? "own data only" : user.role === "HR" ? "HR people operations" : "full company"}. Always label that answers are AI-generated.`,
    },
    { role: "user", content: message },
  ];
  let data = await callLLM(messages);
  let choice = data.choices?.[0]?.message;
  if (choice?.tool_calls?.length) {
    messages.push(choice);
    for (const call of choice.tool_calls) {
      const name = call.function.name as keyof typeof fns;
      const args = JSON.parse(call.function.arguments || "{}");
      if (user.role === "EMPLOYEE" && ["search_employees", "get_payroll_summary"].includes(name) && name === "search_employees") {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ error: "Not allowed" }),
        });
        continue;
      }
      const fn = fns[name];
      const result = fn ? await fn(args) : { error: "Unknown tool" };
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
    data = await callLLM(messages, false);
    choice = data.choices?.[0]?.message;
  }
  const answer = choice?.content || "I could not produce an answer.";
  await prisma.aiLog.create({ data: { userId: user.id, prompt: message, response: answer } });
  return { answer, generated: true };
}

export async function summarizeDashboard(user: AuthUser, filters: { from?: string; to?: string; departmentId?: string }) {
  if (user.role === "EMPLOYEE") throw new ApiError(403, "Dashboard summary is for Admin and HR");
  await rateLimit(user.id);
  const kpis = await dashboards(user, filters);
  const data = await callLLM(
    [
      {
        role: "system",
        content: "Write 3-5 short insight bullets using ONLY the JSON numbers. No invented figures. Label AI-generated.",
      },
      { role: "user", content: JSON.stringify(kpis.kpis) },
    ],
    false,
  );
  const answer = data.choices?.[0]?.message?.content || "No summary.";
  await prisma.aiLog.create({ data: { userId: user.id, prompt: "summarize", response: answer } });
  return { answer, generated: true, kpis: kpis.kpis };
}

export async function smartLeave(user: AuthUser, text: string) {
  if (user.role !== "EMPLOYEE") throw new ApiError(403, "Smart leave is for employees");
  await rateLimit(user.id);
  const types = await prisma.leaveType.findMany();
  const system = `Extract a leave request as JSON only: {"type":"leave type","start":"YYYY-MM-DD","end":"YYYY-MM-DD","reason":"..."}. Today is ${new Date().toISOString().slice(0, 10)}. Available types: ${types.map((t) => t.name).join(", ")}. Do not invent dates. No extra text.`;
  let messages: Record<string, string>[] = [{ role: "system", content: system }, { role: "user", content: text }];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const data = await callLLM(messages, false);
    const raw = data.choices?.[0]?.message?.content || "";
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("missing JSON");
      const parsed = JSON.parse(match[0]) as { type?: unknown; start?: unknown; end?: unknown; reason?: unknown };
      const validDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
      const type = types.find((item) => item.name.toLowerCase() === String(parsed.type || "").toLowerCase());
      if (!type || !validDate(parsed.start) || !validDate(parsed.end) || String(parsed.end) < String(parsed.start) || typeof parsed.reason !== "string" || !parsed.reason.trim()) throw new Error("invalid fields");
      return { leaveTypeId: type.id, type: type.name, startDate: String(parsed.start), endDate: String(parsed.end), reason: parsed.reason.trim(), generated: true };
    } catch {
      if (attempt === 0) messages = [{ role: "system", content: `${system} Your previous answer was invalid. Return a valid JSON object with a real configured leave type and valid ordered dates.` }, { role: "user", content: text }];
    }
  }
  throw new ApiError(422, "Could not understand the leave dates. Please use the regular form.");
}
