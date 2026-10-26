import type { Request, Response } from "express";
import { COOKIE, hydrateUser, signToken, verifyPassword, verifyToken, type AuthUser } from "./auth-core";
import { ApiError } from "./http";
import { prisma } from "./prisma";
import {
  applyLeave, attendanceBoard, auditFeed, cancelLeave, changePassword, checkIn, checkOut,
  createDept, createDesignation, createHoliday, createHrUser, createPayrollDraft, dashboards,
  decideCorrection, decideLeave, exportEmployeesCsv, finalizePayroll, firstRunSetup, getEmployee,
  getPayroll, importEmployeesCsv, listEmployees, listLeave, listOrg, listPayrollRuns,
  listUsers, markNotificationRead, myNotifications, postAnnouncement, registerEmployee,
  requestCorrection, resetUserPassword, setUserActive, setupStatus, updateEmployee,
  updateSettings, upsertLeaveType, leaveBalance,
} from "./services";
import { chatAssistant, smartLeave, summarizeDashboard } from "./ai";

type ApiRequest = Request & { hcmUser?: AuthUser };
const send = (res: Response, value: unknown, status = 200) => res.status(status).json(value);

export async function dispatch(req: ApiRequest, res: Response) {
  const method = req.method;
  const path = req.originalUrl.split("?")[0].replace(/^\/api\/?/, "").replace(/\/$/, "");
  const query = Object.fromEntries(Object.entries(req.query).map(([key, value]) => [key, typeof value === "string" ? value : ""]));
  const body = (req.body ?? {}) as Record<string, unknown>;
  const text = (key: string) => typeof body[key] === "string" ? body[key] as string : "";

  if (path === "health" && method === "GET") {
    try { await prisma.$runCommandRaw({ ping: 1 }); return send(res, { status: "ok", database: "connected" }); }
    catch { return send(res, { status: "degraded", database: "unavailable" }, 503); }
  }
  if (path === "setup/status" && method === "GET") return send(res, await setupStatus());
  if (path === "setup" && method === "POST") {
    return send(res, await firstRunSetup({
      companyName: text("companyName"), adminName: text("adminName") || "Admin",
      adminEmail: text("adminEmail") || process.env.ADMIN_EMAIL || "",
      adminPhone: text("adminPhone"),
      adminPassword: text("adminPassword") || process.env.ADMIN_PASSWORD || "",
    }), 201);
  }
  if (path === "auth/login" && method === "POST") {
    const user = await prisma.user.findUnique({ where: { email: text("email").trim().toLowerCase() }, include: { employee: true } });
    if (!user || !user.active || !(await verifyPassword(text("password"), user.passwordHash))) throw new ApiError(401, "Invalid email or password");
    const requestedRole = text("role");
    if (requestedRole && !["ADMIN", "HR", "EMPLOYEE"].includes(requestedRole)) throw new ApiError(400, "Choose a valid account role");
    if (requestedRole && user.role !== requestedRole) throw new ApiError(401, "The selected role does not match this account");
    const auth: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role as AuthUser["role"], employeeId: user.employee?.id ?? null, mustChangePassword: user.mustChangePassword };
    res.cookie(COOKIE, signToken(auth), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
    return send(res, auth);
  }
  if (path === "auth/logout" && method === "POST") {
    res.clearCookie(COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
    return send(res, { ok: true });
  }
  if (path === "auth/me" && method === "GET") {
    const token = verifyToken(req.cookies?.[COOKIE]);
    if (!token) return send(res, { user: null, setup: await setupStatus() });
    return send(res, { user: await hydrateUser(token.id), setup: await setupStatus() });
  }

  const token = verifyToken(req.cookies?.[COOKIE]);
  if (!token) throw new ApiError(401, "Sign in required");
  const user = await hydrateUser(token.id);
  if (!user) throw new ApiError(401, "Session expired");
  if (user.mustChangePassword && path !== "auth/change-password") throw new ApiError(403, "Change your temporary password first");
  req.hcmUser = user;

  if (path === "auth/change-password" && method === "POST") {
    const updated = await changePassword(user, text("current"), text("next"));
    if (updated) res.cookie(COOKIE, signToken(updated), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
    return send(res, updated);
  }

  if (path === "org" && method === "GET") return send(res, await listOrg());
  if (path === "settings" && method === "PUT") { if (user.role !== "ADMIN") throw new ApiError(403, "Admin only"); return send(res, await updateSettings(user, body)); }
  if (path === "departments" && method === "POST") { if (user.role !== "ADMIN") throw new ApiError(403, "Admin only"); return send(res, await createDept(user, text("name")), 201); }
  if (path === "designations" && method === "POST") { if (user.role !== "ADMIN") throw new ApiError(403, "Admin only"); return send(res, await createDesignation(user, text("name")), 201); }
  if (path === "leave-types" && method === "POST") { if (user.role !== "ADMIN") throw new ApiError(403, "Admin only"); return send(res, await upsertLeaveType(user, body as { id?: string; name: string; quota: number; unlimited?: boolean })); }
  if (path === "holidays" && method === "POST") { if (user.role !== "ADMIN") throw new ApiError(403, "Admin only"); return send(res, await createHoliday(user, String(body.date || ""), String(body.name || "")), 201); }

  if (path === "users" && method === "GET") { if (user.role !== "ADMIN") throw new ApiError(403, "Admin only"); return send(res, await listUsers()); }
  if (path === "users" && method === "POST") { if (user.role !== "ADMIN") throw new ApiError(403, "Admin only"); return send(res, await createHrUser(user, body as { name: string; email: string }), 201); }
  const userReset = path.match(/^users\/([^/]+)\/reset$/);
  if (userReset && method === "POST") { if (user.role !== "ADMIN") throw new ApiError(403, "Admin only"); return send(res, await resetUserPassword(user, userReset[1])); }
  const userActive = path.match(/^users\/([^/]+)\/active$/);
  if (userActive && method === "POST") { if (user.role !== "ADMIN") throw new ApiError(403, "Admin only"); return send(res, await setUserActive(user, userActive[1], Boolean(body.active))); }

  if (path === "employees" && method === "GET") return send(res, await listEmployees(user, query));
  if (path === "employees" && method === "POST") { if (user.role !== "HR") throw new ApiError(403, "HR registers employees"); return send(res, await registerEmployee(user, body as Parameters<typeof registerEmployee>[1]), 201); }
  if (path === "employees/export" && method === "GET") { if (user.role !== "HR") throw new ApiError(403, "HR only"); res.type("text/csv").attachment("employees.csv"); return res.send(await exportEmployeesCsv()); }
  if (path === "employees/import" && method === "POST") { if (user.role !== "HR") throw new ApiError(403, "HR only"); return send(res, await importEmployeesCsv(user, text("csv"), body.dryRun !== false)); }
  const employee = path.match(/^employees\/([^/]+)$/);
  if (employee && method === "GET") return send(res, await getEmployee(user, employee[1]));
  if (employee && method === "PATCH") return send(res, await updateEmployee(user, employee[1], body));

  if (path === "attendance" && method === "GET") return send(res, await attendanceBoard(user, query.date));
  if (path === "attendance/check-in" && method === "POST") return send(res, await checkIn(user, body as Parameters<typeof checkIn>[1]));
  if (path === "attendance/check-out" && method === "POST") return send(res, await checkOut(user));
  if (path === "attendance/corrections" && method === "POST") return send(res, await requestCorrection(user, body as Parameters<typeof requestCorrection>[1]), 201);
  if (path === "attendance/corrections" && method === "GET") {
    const own = user.role === "EMPLOYEE" ? user.employeeId : undefined;
    return send(res, await prisma.attendanceCorrection.findMany({ where: own ? { employeeId: own } : {}, include: { employee: true }, orderBy: { createdAt: "desc" } }));
  }
  const correction = path.match(/^attendance\/corrections\/([^/]+)\/decide$/);
  if (correction && method === "POST") { if (user.role !== "HR") throw new ApiError(403, "HR approves corrections"); return send(res, await decideCorrection(user, correction[1], body.status as "APPROVED" | "REJECTED", text("comment"))); }

  if (path === "leave" && method === "GET") return send(res, await listLeave(user));
  if (path === "leave" && method === "POST") return send(res, await applyLeave(user, body as Parameters<typeof applyLeave>[1]), 201);
  if (path === "leave/balance" && method === "GET") return send(res, await leaveBalance(user, query.employeeId));
  const leaveCancel = path.match(/^leave\/([^/]+)\/cancel$/);
  if (leaveCancel && method === "POST") return send(res, await cancelLeave(user, leaveCancel[1]));
  const leaveDecide = path.match(/^leave\/([^/]+)\/decide$/);
  if (leaveDecide && method === "POST") { if (user.role !== "HR") throw new ApiError(403, "HR approves leave"); return send(res, await decideLeave(user, leaveDecide[1], body.status as "APPROVED" | "REJECTED", text("comment"))); }

  if (path === "payroll" && method === "GET") {
    if (query.id) return send(res, await getPayroll(user, query.id));
    if (query.year && query.month) return send(res, await getPayroll(user, undefined, Number(query.year), Number(query.month)));
    return send(res, { runs: await listPayrollRuns(user), current: await getPayroll(user) });
  }
  if (path === "payroll" && method === "POST") { if (user.role !== "HR") throw new ApiError(403, "HR creates payroll drafts"); return send(res, await createPayrollDraft(user, Number(body.year), Number(body.month)), 201); }
  const finalize = path.match(/^payroll\/([^/]+)\/finalize$/);
  if (finalize && method === "POST") { if (user.role !== "ADMIN") throw new ApiError(403, "Only Admin can finalize payroll"); return send(res, await finalizePayroll(user, finalize[1])); }
  const payslip = path.match(/^payslips\/([^/]+)$/);
  if (payslip && method === "GET") {
    const row = await prisma.payslip.findUnique({ where: { id: payslip[1] }, include: { employee: true, run: true } });
    if (!row || (user.role === "EMPLOYEE" && row.run.status !== "FINALIZED")) throw new ApiError(404, "Payslip not found");
    if (user.role === "EMPLOYEE" && row.employeeId !== user.employeeId) throw new ApiError(403, "Own payslips only");
    res.type("html");
    return res.send(`<!doctype html><html><body style="font-family:Arial;padding:32px"><h1>HCM Lite Payslip</h1><p>${row.employee.fullName} · ${row.employee.code}</p><p>Period: ${row.run.month}/${row.run.year} · ${row.run.status}</p><table border="1" cellpadding="8" cellspacing="0"><tr><td>Basic</td><td>${row.basic.toFixed(2)}</td></tr><tr><td>Gross</td><td>${row.gross.toFixed(2)}</td></tr><tr><td>Deductions</td><td>${row.deductions.toFixed(2)}</td></tr><tr><td>Tax</td><td>${row.tax.toFixed(2)}</td></tr><tr><td><b>Net</b></td><td><b>${row.net.toFixed(2)}</b></td></tr></table><p>Print this page to save as PDF.</p><script>window.print()</script></body></html>`);
  }

  if (path === "dashboards" && method === "GET") return send(res, await dashboards(user, query));
  if (path === "ai/chat" && method === "POST") return send(res, await chatAssistant(user, text("message")));
  if (path === "ai/summarize" && method === "POST") return send(res, await summarizeDashboard(user, body as Parameters<typeof summarizeDashboard>[1]));
  if (path === "ai/smart-leave" && method === "POST") { if (user.role !== "EMPLOYEE") throw new ApiError(403, "Smart leave is for employees"); return send(res, await smartLeave(user, text("text"))); }

  if (path === "announcements" && method === "GET") return send(res, await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } }));
  if (path === "announcements" && method === "POST") { if (user.role === "EMPLOYEE") throw new ApiError(403, "Employees cannot post"); return send(res, await postAnnouncement(user, text("title"), text("body")), 201); }
  if (path === "notifications" && method === "GET") return send(res, await myNotifications(user));
  const notification = path.match(/^notifications\/([^/]+)\/read$/);
  if (notification && method === "POST") return send(res, await markNotificationRead(user, notification[1]));
  if (path === "audit" && method === "GET") { if (user.role !== "ADMIN") throw new ApiError(403, "Admin only"); return send(res, await auditFeed()); }

  throw new ApiError(404, `Unknown API route ${method} /api/${path}`);
}
