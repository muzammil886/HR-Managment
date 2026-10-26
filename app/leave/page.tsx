"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/layout/dashboard-shell";
import { useAuth } from "../providers";
import { api } from "@/lib/client";

type LeaveType = { id: string; name: string; quota: number; unlimited: boolean };
type Leave = { id: string; employeeId: string; startDate: string; endDate: string; days: number; reason: string; status: string; comment: string; employee: { fullName: string; code: string }; leaveType: { name: string } };
type Balance = { leaveTypeId: string; name: string; quota: number | null; used: number; remaining: number | null; unlimited: boolean };
type Org = { leaveTypes: LeaveType[] };
type Suggestion = { leaveTypeId?: string; type?: string; startDate: string; endDate: string; reason: string };

export default function LeavePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Leave[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [balance, setBalance] = useState<Balance[]>([]);
  const [typeId, setTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [plainText, setPlainText] = useState("");
  const [comment, setComment] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const [leaveRows, org] = await Promise.all([api<Leave[]>("/api/leave"), api<Org>("/api/org")]);
    setRows(leaveRows); setTypes(org.leaveTypes);
    if (user?.role === "EMPLOYEE") setBalance(await api<Balance[]>("/api/leave/balance"));
  }
  useEffect(() => {
    let active = true;
    Promise.all([api<Leave[]>("/api/leave"), api<Org>("/api/org")])
      .then(async ([leaveRows, org]) => {
        if (!active) return;
        setRows(leaveRows); setTypes(org.leaveTypes);
        if (user?.role === "EMPLOYEE") {
          const result = await api<Balance[]>("/api/leave/balance");
          if (active) setBalance(result);
        }
      })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load leave records."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.role]);

  async function suggest() {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await api<Suggestion>("/api/ai/smart-leave", { method: "POST", body: JSON.stringify({ text: plainText }) });
      setTypeId(result.leaveTypeId || ""); setStartDate(result.startDate); setEndDate(result.endDate); setReason(result.reason);
      setNotice("AI-generated suggestion. Review the details, then submit to confirm.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not interpret your request."); }
    finally { setBusy(false); }
  }

  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await api("/api/leave", { method: "POST", body: JSON.stringify({ leaveTypeId: typeId, startDate, endDate, reason }) }); setNotice("Leave request submitted."); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not submit leave request."); }
    finally { setBusy(false); }
  }

  async function action(id: string, actionName: "cancel" | "decide", status?: "APPROVED" | "REJECTED") {
    setBusy(true); setError("");
    try {
      const path = actionName === "cancel" ? `/api/leave/${id}/cancel` : `/api/leave/${id}/decide`;
      await api(path, { method: "POST", body: actionName === "decide" ? JSON.stringify({ status, comment: comment[id] || "" }) : "{}" });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update leave request."); }
    finally { setBusy(false); }
  }

  return <AppShell><main className="space-y-6"><header><p className="text-sm text-[#8993a7]">People / Time off</p><h1 className="mt-2 text-2xl font-extrabold text-[#18302e]">Leave</h1><p className="mt-2 text-sm text-[#8993a7]">Requests use workday, holiday, overlap, and quota rules on the server.</p></header>
    {error && <p role="alert" className="rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b94b4b]">{error}</p>}{notice && <p className="rounded-xl bg-[#e6f8f0] px-4 py-3 text-sm text-[#16865f]">{notice}</p>}
    {user?.role === "EMPLOYEE" && <><section className="premium-card p-5"><h2 className="font-bold text-[#18302e]">My balance</h2><div className="mt-4 flex flex-wrap gap-3">{balance.map((item) => <div key={item.leaveTypeId} className="rounded-xl border border-[#edf0f6] px-4 py-3"><p className="text-xs text-[#8993a7]">{item.name}</p><p className="mt-1 font-bold">{item.unlimited ? `${item.used} used · Unlimited` : `${item.remaining} days left`}</p></div>)}{!balance.length && <p className="text-sm text-[#8993a7]">No leave types configured yet.</p>}</div></section>
      <form onSubmit={apply} className="premium-card space-y-3 p-5"><h2 className="font-bold text-[#18302e]">Apply for leave</h2><div className="flex flex-wrap gap-2"><input value={plainText} onChange={(event) => setPlainText(event.target.value)} placeholder="e.g. I need next Monday and Tuesday off for a wedding" className="min-w-64 flex-1 rounded-xl border px-3 py-2.5 text-sm" /><button type="button" disabled={busy || !plainText} onClick={() => void suggest()} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Suggest with AI</button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><select required value={typeId} onChange={(event) => setTypeId(event.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Leave type</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select><input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-xl border px-3 py-2.5 text-sm" /><input required type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded-xl border px-3 py-2.5 text-sm" /><input required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" className="rounded-xl border px-3 py-2.5 text-sm" /></div><button disabled={busy} className="rounded-xl bg-[#147d72] px-4 py-3 text-sm font-bold text-white">Submit request</button></form></>}
    <section className="premium-card overflow-hidden"><div className="border-b border-[#edf0f6] p-5"><h2 className="font-bold text-[#18302e]">Leave requests</h2><p className="mt-1 text-xs text-[#8993a7]">{rows.length} records</p></div><div className="divide-y divide-[#edf0f6]">{rows.map((row) => <article key={row.id} className="space-y-3 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-[#344057]">{row.leaveType.name} · {row.days} working days</p><p className="mt-1 text-sm text-[#69758b]">{row.employee.fullName} ({row.employee.code}) · {row.startDate} to {row.endDate}</p><p className="mt-1 text-sm text-[#8993a7]">{row.reason}</p>{row.comment && <p className="mt-1 text-sm text-[#8993a7]">Decision: {row.comment}</p>}</div><span className="rounded-full bg-[#f0f2f6] px-3 py-1.5 text-xs font-bold">{row.status}</span></div>{user?.role === "HR" && row.status === "PENDING" && <div className="flex flex-wrap gap-2"><input value={comment[row.id] || ""} onChange={(event) => setComment({ ...comment, [row.id]: event.target.value })} placeholder="Decision comment (optional)" className="min-w-48 flex-1 rounded-xl border px-3 py-2 text-sm" /><button disabled={busy} onClick={() => void action(row.id, "decide", "APPROVED")} className="rounded-xl bg-[#16865f] px-3 py-2 text-sm font-semibold text-white">Approve</button><button disabled={busy} onClick={() => void action(row.id, "decide", "REJECTED")} className="rounded-xl bg-[#b94b4b] px-3 py-2 text-sm font-semibold text-white">Reject</button></div>}{user?.role === "EMPLOYEE" && row.status === "PENDING" && <button disabled={busy} onClick={() => void action(row.id, "cancel")} className="text-sm font-semibold text-[#b94b4b]">Cancel request</button>}</article>)}{loading && <p className="p-6 text-sm text-[#8993a7]">Loading leave requests…</p>}{!loading && !rows.length && <p className="p-8 text-center text-sm text-[#8993a7]">No leave requests yet.</p>}</div></section>
  </main></AppShell>;
}
