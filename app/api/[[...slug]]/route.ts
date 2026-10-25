import { NextRequest } from "next/server";
import { clearSession, getSession, requireUser, setSession, verifyPassword } from "@/lib/auth";
import { ApiError, handle, ok, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  applyLeave,
  attendanceBoard,
  auditFeed,
  cancelLeave,
  changePassword,
  checkIn,
  checkOut,
  createDept,
  createDesignation,
  createHoliday,
  createHrUser,
  createPayrollDraft,
  dashboards,
  decideCorrection,
  decideLeave,
  exportEmployeesCsv,
  finalizePayroll,
  firstRunSetup,
  getEmployee,
  getPayroll,
  importEmployeesCsv,
  listEmployees,
  listLeave,
  listOrg,
  listPayrollRuns,
  listUsers,
  markNotificationRead,
  myNotifications,
  postAnnouncement,
  registerEmployee,
  requestCorrection,
  resetUserPassword,
  setUserActive,
  setupStatus,
  updateEmployee,
  updateSettings,
  upsertLeaveType,
  leaveBalance,
} from "@/lib/services";
import { chatAssistant, smartLeave, summarizeDashboard } from "@/lib/ai";

function pathOf(req: NextRequest) {
  const url = new URL(req.url);
  return url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
}

async function dispatch(req: NextRequest) {
  const method = req.method;
  const path = pathOf(req);
  const url = new URL(req.url);
  const q = Object.fromEntries(url.searchParams.entries());

  if (path === "setup/status" && method === "GET") return ok(await setupStatus());

  if (path === "setup" && method === "POST") {
    const body = await readJson<{
      companyName?: string;
      adminName?: string;
      adminEmail?: string;
      adminPassword?: string;
    }>(req);
    const result = await firstRunSetup({
      companyName: body.companyName || "",
      adminName: body.adminName || "Admin",
      adminEmail: body.adminEmail || process.env.ADMIN_EMAIL || "",
      adminPassword: body.adminPassword || process.env.ADMIN_PASSWORD || "",
    });
    return ok(result, 201);
  }

  if (path === "auth/login" && method === "POST") {
    const body = await readJson<{ email: string; password: string }>(req);
    const user = await prisma.user.findUnique({ where: { email: body.email.trim().toLowerCase() }, include: { employee: true } });
    if (!user || !user.active || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new ApiError(401, "Invalid email or password");
    }
    const auth = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "ADMIN" | "HR" | "EMPLOYEE",
      employeeId: user.employee?.id ?? null,
      mustChangePassword: user.mustChangePassword,
    };
    await setSession(auth);
    return ok(auth);
  }

  if (path === "auth/logout" && method === "POST") {
    await clearSession();
    return ok({ ok: true });
  }

  if (path === "auth/me" && method === "GET") {
    const session = await getSession();
    if (!session) return ok({ user: null });
    const { hydrateUser } = await import("@/lib/auth");
    return ok({ user: await hydrateUser(session.id), setup: await setupStatus() });
  }

  if (path === "auth/change-password" && method === "POST") {
    const user = await requireUser(undefined, { allowPasswordChange: true });
    const body = await readJson<{ current: string; next: string }>(req);
    const updated = await changePassword(user, body.current, body.next);
    if (updated) await setSession(updated);
    return ok(updated);
  }

  const user = await requireUser();

  if (path === "org" && method === "GET") return ok(await listOrg());
  if (path === "settings" && method === "PUT") {
    if (user.role !== "ADMIN") throw new ApiError(403, "Admin only");
    return ok(await updateSettings(user, await readJson(req)));
  }
  if (path === "departments" && method === "POST") {
    if (user.role !== "ADMIN") throw new ApiError(403, "Admin only");
    const body = await readJson<{ name: string }>(req);
    return ok(await createDept(user, body.name), 201);
  }
  if (path === "designations" && method === "POST") {
    if (user.role !== "ADMIN") throw new ApiError(403, "Admin only");
    const body = await readJson<{ name: string }>(req);
    return ok(await createDesignation(user, body.name), 201);
  }
  if (path === "leave-types" && method === "POST") {
    if (user.role !== "ADMIN") throw new ApiError(403, "Admin only");
    return ok(await upsertLeaveType(user, await readJson(req)));
  }
  if (path === "holidays" && method === "POST") {
    if (user.role !== "ADMIN") throw new ApiError(403, "Admin only");
    const body = await readJson<{ date: string; name: string }>(req);
    return ok(await createHoliday(user, body.date, body.name), 201);
  }

  if (path === "users" && method === "GET") {
    if (user.role !== "ADMIN") throw new ApiError(403, "Admin only");
    return ok(await listUsers());
  }
  if (path === "users" && method === "POST") {
    if (user.role !== "ADMIN") throw new ApiError(403, "Admin only");
    return ok(await createHrUser(user, await readJson(req)), 201);
  }
  const userReset = path.match(/^users\/([^/]+)\/reset$/);
  if (userReset && method === "POST") {
    if (user.role !== "ADMIN") throw new ApiError(403, "Admin only");
    return ok(await resetUserPassword(user, userReset[1]));
  }
  const userActive = path.match(/^users\/([^/]+)\/active$/);
  if (userActive && method === "POST") {
    if (user.role !== "ADMIN") throw new ApiError(403, "Admin only");
    const body = await readJson<{ active: boolean }>(req);
    return ok(await setUserActive(user, userActive[1], body.active));
  }

  if (path === "employees" && method === "GET") return ok(await listEmployees(user, q));
  if (path === "employees" && method === "POST") {
    if (user.role !== "HR") throw new ApiError(403, "HR registers employees");
    return ok(await registerEmployee(user, await readJson(req)), 201);
  }
  if (path === "employees/export" && method === "GET") {
    if (user.role !== "HR") throw new ApiError(403, "HR only");
    const csv = await exportEmployeesCsv();
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=employees.csv",
      },
    });
  }
  if (path === "employees/import" && method === "POST") {
    if (user.role !== "HR") throw new ApiError(403, "HR only");
    const body = await readJson<{ csv: string; dryRun?: boolean }>(req);
    return ok(await importEmployeesCsv(user, body.csv, body.dryRun !== false));
  }
  const empId = path.match(/^employees\/([^/]+)$/);
  if (empId && method === "GET") return ok(await getEmployee(user, empId[1]));
  if (empId && method === "PATCH") return ok(await updateEmployee(user, empId[1], await readJson(req)));

  if (path === "attendance" && method === "GET") return ok(await attendanceBoard(user, q.date));
  if (path === "attendance/check-in" && method === "POST") return ok(await checkIn(user, await readJson(req).catch(() => ({}))));
  if (path === "attendance/check-out" && method === "POST") return ok(await checkOut(user));
  if (path === "attendance/corrections" && method === "POST") {
    return ok(await requestCorrection(user, await readJson(req)), 201);
  }
  if (path === "attendance/corrections" && method === "GET") {
    const own = user.role === "EMPLOYEE" ? user.employeeId : undefined;
    const rows = await prisma.attendanceCorrection.findMany({
      where: own ? { employeeId: own } : {},
      include: { employee: true },
      orderBy: { createdAt: "desc" },
    });
    return ok(rows);
  }
  const corr = path.match(/^attendance\/corrections\/([^/]+)\/decide$/);
  if (corr && method === "POST") {
    if (user.role !== "HR") throw new ApiError(403, "HR approves corrections");
    const body = await readJson<{ status: "APPROVED" | "REJECTED"; comment?: string }>(req);
    return ok(await decideCorrection(user, corr[1], body.status, body.comment || ""));
  }

  if (path === "leave" && method === "GET") return ok(await listLeave(user));
  if (path === "leave" && method === "POST") return ok(await applyLeave(user, await readJson(req)), 201);
  if (path === "leave/balance" && method === "GET") return ok(await leaveBalance(user, q.employeeId));
  const leaveCancel = path.match(/^leave\/([^/]+)\/cancel$/);
  if (leaveCancel && method === "POST") return ok(await cancelLeave(user, leaveCancel[1]));
  const leaveDecide = path.match(/^leave\/([^/]+)\/decide$/);
  if (leaveDecide && method === "POST") {
    if (user.role !== "HR") throw new ApiError(403, "HR approves leave");
    const body = await readJson<{ status: "APPROVED" | "REJECTED"; comment?: string }>(req);
    return ok(await decideLeave(user, leaveDecide[1], body.status, body.comment || ""));
  }

  if (path === "payroll" && method === "GET") {
    if (q.id) return ok(await getPayroll(user, q.id));
    if (q.year && q.month) return ok(await getPayroll(user, undefined, Number(q.year), Number(q.month)));
    return ok({ runs: await listPayrollRuns(user), current: await getPayroll(user) });
  }
  if (path === "payroll" && method === "POST") {
    if (user.role !== "HR") throw new ApiError(403, "HR creates payroll drafts");
    const body = await readJson<{ year: number; month: number }>(req);
    return ok(await createPayrollDraft(user, Number(body.year), Number(body.month)), 201);
  }
  const fin = path.match(/^payroll\/([^/]+)\/finalize$/);
  if (fin && method === "POST") {
    if (user.role !== "ADMIN") throw new ApiError(403, "Only Admin can finalize payroll");
    return ok(await finalizePayroll(user, fin[1]));
  }
  const slip = path.match(/^payslips\/([^/]+)$/);
  if (slip && method === "GET") {
    const row = await prisma.payslip.findUnique({
      where: { id: slip[1] },
      include: { employee: true, run: true },
    });
    if (!row) throw new ApiError(404, "Payslip not found");
    if (user.role === "EMPLOYEE" && row.employeeId !== user.employeeId) {
      throw new ApiError(403, "Own payslips only");
    }
    const html = `<!doctype html><html><body style="font-family:Arial;padding:32px">
      <h1>HCM Lite Payslip</h1>
      <p>${row.employee.fullName} · ${row.employee.code}</p>
      <p>Period: ${row.run.month}/${row.run.year} · ${row.run.status}</p>
      <table border="1" cellpadding="8" cellspacing="0">
        <tr><td>Basic</td><td>${row.basic.toFixed(2)}</td></tr>
        <tr><td>Gross</td><td>${row.gross.toFixed(2)}</td></tr>
        <tr><td>Deductions</td><td>${row.deductions.toFixed(2)}</td></tr>
        <tr><td>Tax</td><td>${row.tax.toFixed(2)}</td></tr>
        <tr><td><b>Net</b></td><td><b>${row.net.toFixed(2)}</b></td></tr>
      </table>
      <p>Print this page to save as PDF.</p>
      <script>window.print()</script>
      </body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  if (path === "dashboards" && method === "GET") return ok(await dashboards(user, q));

  if (path === "ai/chat" && method === "POST") {
    const body = await readJson<{ message: string }>(req);
    return ok(await chatAssistant(user, body.message));
  }
  if (path === "ai/summarize" && method === "POST") {
    return ok(await summarizeDashboard(user, await readJson(req).catch(() => ({}))));
  }
  if (path === "ai/smart-leave" && method === "POST") {
    if (user.role === "ADMIN") throw new ApiError(403, "Smart leave is for employees");
    return ok(await smartLeave(user, (await readJson<{ text: string }>(req)).text));
  }

  if (path === "announcements" && method === "GET") {
    return ok(await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } }));
  }
  if (path === "announcements" && method === "POST") {
    if (user.role === "EMPLOYEE") throw new ApiError(403, "Employees cannot post");
    const body = await readJson<{ title: string; body: string }>(req);
    return ok(await postAnnouncement(user, body.title, body.body), 201);
  }
  if (path === "notifications" && method === "GET") return ok(await myNotifications(user));
  const nread = path.match(/^notifications\/([^/]+)\/read$/);
  if (nread && method === "POST") return ok(await markNotificationRead(user, nread[1]));
  if (path === "audit" && method === "GET") {
    if (user.role !== "ADMIN") throw new ApiError(403, "Admin only");
    return ok(await auditFeed());
  }

  throw new ApiError(404, `Unknown API route ${method} /api/${path}`);
}

export async function GET(req: NextRequest) {
  try {
    return await dispatch(req);
  } catch (e) {
    return handle(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    return await dispatch(req);
  } catch (e) {
    return handle(e);
  }
}
export async function PUT(req: NextRequest) {
  try {
    return await dispatch(req);
  } catch (e) {
    return handle(e);
  }
}
export async function PATCH(req: NextRequest) {
  try {
    return await dispatch(req);
  } catch (e) {
    return handle(e);
  }
}
