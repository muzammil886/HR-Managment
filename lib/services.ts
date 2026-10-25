import { prisma } from "./prisma";
import {
  type AuthUser,
  hashPassword,
  hydrateUser,
  ownEmployeeId,
  randomPassword,
} from "./auth";
import { ApiError } from "./http";
import { audit, notify } from "./audit";
import {
  annualTax,
  attendanceStatus,
  eachDate,
  grossFromBasic,
  haversineMeters,
  monthRange,
  nextCode,
  todayISO,
  workingDates,
} from "./rules";

async function companyOrThrow() {
  const company = await prisma.company.findFirst();
  if (!company) throw new ApiError(400, "Complete first-run setup first");
  return company;
}

async function holidaySet() {
  const rows = await prisma.holiday.findMany();
  return new Set(rows.map((h) => h.date));
}

export async function setupStatus() {
  const company = await prisma.company.findFirst();
  return { ready: Boolean(company), companyName: company?.name ?? null };
}

export async function firstRunSetup(input: {
  companyName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}) {
  if (await prisma.company.findFirst()) {
    throw new ApiError(409, "Company already exists");
  }
  if (!input.companyName?.trim() || !input.adminEmail || !input.adminPassword) {
    throw new ApiError(400, "Company name, admin email and password are required");
  }
  if (input.adminPassword.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }
  const company = await prisma.company.create({
    data: { name: input.companyName.trim() },
  });
  const admin = await prisma.user.create({
    data: {
      name: input.adminName.trim() || "Admin",
      email: input.adminEmail.trim().toLowerCase(),
      passwordHash: await hashPassword(input.adminPassword),
      role: "ADMIN",
    },
  });
  await prisma.leaveType.createMany({
    data: [
      { name: "Annual", quota: 14 },
      { name: "Sick", quota: 8 },
      { name: "Casual", quota: 10 },
      { name: "Unpaid", quota: 0, unlimited: true },
    ],
  });
  return { company, admin: { id: admin.id, email: admin.email } };
}

export async function changePassword(user: AuthUser, current: string, next: string) {
  const row = await prisma.user.findUnique({ where: { id: user.id } });
  if (!row) throw new ApiError(404, "User not found");
  const bcrypt = await import("bcryptjs");
  if (!(await bcrypt.compare(current, row.passwordHash))) {
    throw new ApiError(400, "Current password is incorrect");
  }
  if (!next || next.length < 6) throw new ApiError(400, "New password must be at least 6 characters");
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  return hydrateUser(user.id);
}

export async function updateSettings(user: AuthUser, body: Record<string, unknown>) {
  const company = await companyOrThrow();
  const updated = await prisma.company.update({
    where: { id: company.id },
    data: {
      name: String(body.name ?? company.name),
      officeStart: String(body.officeStart ?? company.officeStart),
      graceMinutes: Number(body.graceMinutes ?? company.graceMinutes),
      halfDayHours: Number(body.halfDayHours ?? company.halfDayHours),
      weekend: String(body.weekend ?? company.weekend),
      officeLat: body.officeLat === null || body.officeLat === "" ? null : Number(body.officeLat ?? company.officeLat),
      officeLng: body.officeLng === null || body.officeLng === "" ? null : Number(body.officeLng ?? company.officeLng),
      radiusMeters: Number(body.radiusMeters ?? company.radiusMeters),
    },
  });
  await audit(user, "update", "settings", company.id, company, updated);
  return updated;
}

export async function listOrg() {
  const [company, departments, designations, leaveTypes, holidays] = await Promise.all([
    companyOrThrow(),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.designation.findMany({ orderBy: { name: "asc" } }),
    prisma.leaveType.findMany({ orderBy: { name: "asc" } }),
    prisma.holiday.findMany({ orderBy: { date: "asc" } }),
  ]);
  return { company, departments, designations, leaveTypes, holidays };
}

export async function createDept(user: AuthUser, name: string) {
  const row = await prisma.department.create({ data: { name: name.trim() } });
  await audit(user, "create", "department", row.id, null, row);
  return row;
}

export async function createDesignation(user: AuthUser, name: string) {
  const row = await prisma.designation.create({ data: { name: name.trim() } });
  await audit(user, "create", "designation", row.id, null, row);
  return row;
}

export async function upsertLeaveType(
  user: AuthUser,
  input: { id?: string; name: string; quota: number; unlimited?: boolean },
) {
  const data = {
    name: input.name.trim(),
    quota: Number(input.quota) || 0,
    unlimited: Boolean(input.unlimited),
  };
  const row = input.id
    ? await prisma.leaveType.update({ where: { id: input.id }, data })
    : await prisma.leaveType.create({ data });
  await audit(user, input.id ? "update" : "create", "leaveType", row.id, null, row);
  return row;
}

export async function createHoliday(user: AuthUser, date: string, name: string) {
  const row = await prisma.holiday.create({ data: { date, name: name.trim() } });
  await audit(user, "create", "holiday", row.id, null, row);
  return row;
}

export async function createHrUser(user: AuthUser, input: { name: string; email: string }) {
  const password = randomPassword();
  const row = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: await hashPassword(password),
      role: "HR",
      mustChangePassword: true,
    },
  });
  await audit(user, "create", "user", row.id, null, { email: row.email, role: "HR" });
  return { id: row.id, email: row.email, name: row.name, temporaryPassword: password };
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });
}

export async function setUserActive(user: AuthUser, id: string, active: boolean) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new ApiError(404, "User not found");
  if (target.role === "ADMIN") throw new ApiError(400, "Cannot deactivate Admin");
  const updated = await prisma.user.update({ where: { id }, data: { active } });
  await audit(user, active ? "activate" : "deactivate", "user", id, target, updated);
  return { id, active };
}

export async function resetUserPassword(user: AuthUser, id: string) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new ApiError(404, "User not found");
  const password = randomPassword();
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true, active: true },
  });
  await audit(user, "reset_password", "user", id);
  return { id, email: target.email, temporaryPassword: password };
}

function scopedEmployeeWhere(user: AuthUser, extra: Record<string, unknown> = {}) {
  const own = ownEmployeeId(user);
  return own ? { ...extra, id: own } : extra;
}

export async function listEmployees(
  user: AuthUser,
  query: { q?: string; departmentId?: string; status?: string; page?: number; pageSize?: number },
) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(50, Math.max(5, Number(query.pageSize) || 10));
  const where: Record<string, unknown> = scopedEmployeeWhere(user);
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { fullName: { contains: query.q } },
      { email: { contains: query.q } },
      { code: { contains: query.q } },
    ];
  }
  const [total, items] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      include: { department: true, designation: true, user: { select: { id: true, email: true, active: true } } },
      orderBy: { code: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, page, pageSize, items };
}

export async function getEmployee(user: AuthUser, id: string) {
  const own = ownEmployeeId(user);
  if (own && own !== id) throw new ApiError(403, "You can only view your own profile");
  const row = await prisma.employee.findUnique({
    where: { id },
    include: { department: true, designation: true, user: { select: { id: true, email: true, active: true } } },
  });
  if (!row) throw new ApiError(404, "Employee not found");
  const hideSalary = user.role === "EMPLOYEE";
  return hideSalary ? { ...row, basicSalary: null } : row;
}

export async function registerEmployee(
  user: AuthUser,
  input: {
    fullName: string;
    email: string;
    phone?: string;
    address?: string;
    gender?: string;
    departmentId: string;
    designationId: string;
    joinDate: string;
    basicSalary: number;
    status?: string;
  },
) {
  if (!input.fullName || !input.email || !input.departmentId || !input.designationId || !input.joinDate) {
    throw new ApiError(400, "Missing required employee fields");
  }
  if (!(Number(input.basicSalary) > 0)) throw new ApiError(400, "Salary must be greater than 0");
  const last = await prisma.employee.findFirst({ orderBy: { code: "desc" } });
  const password = randomPassword();
  const login = await prisma.user.create({
    data: {
      name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: await hashPassword(password),
      role: "EMPLOYEE",
      mustChangePassword: true,
    },
  });
  const employee = await prisma.employee.create({
    data: {
      code: nextCode(last?.code),
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone ?? "",
      address: input.address ?? "",
      gender: input.gender ?? "",
      departmentId: input.departmentId,
      designationId: input.designationId,
      joinDate: new Date(`${input.joinDate}T00:00:00`),
      basicSalary: Number(input.basicSalary),
      status: input.status || "ACTIVE",
      userId: login.id,
    },
    include: { department: true, designation: true },
  });
  await audit(user, "create", "employee", employee.id, null, employee);
  return { employee, temporaryPassword: password };
}

export async function updateEmployee(
  user: AuthUser,
  id: string,
  input: Record<string, unknown>,
) {
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Employee not found");
  if (user.role === "EMPLOYEE") {
    if (user.employeeId !== id) throw new ApiError(403, "You can only edit your own contact details");
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        phone: String(input.phone ?? existing.phone),
        address: String(input.address ?? existing.address),
      },
    });
    await audit(user, "update", "employee", id, existing, updated);
    return updated;
  }
  if (user.role === "ADMIN") throw new ApiError(403, "Admin can view employees; HR manages details");
  const updated = await prisma.employee.update({
    where: { id },
    data: {
      fullName: String(input.fullName ?? existing.fullName),
      phone: String(input.phone ?? existing.phone),
      address: String(input.address ?? existing.address),
      gender: String(input.gender ?? existing.gender),
      departmentId: String(input.departmentId ?? existing.departmentId),
      designationId: String(input.designationId ?? existing.designationId),
      status: String(input.status ?? existing.status),
      basicSalary: Number(input.basicSalary ?? existing.basicSalary),
      joinDate: input.joinDate ? new Date(`${input.joinDate}T00:00:00`) : existing.joinDate,
      exitDate: input.exitDate ? new Date(`${input.exitDate}T00:00:00`) : existing.exitDate,
    },
    include: { department: true, designation: true },
  });
  await audit(user, "update", "employee", id, existing, updated);
  return updated;
}

export type CsvIssue = { row: number; field: string; reason: string };

export async function importEmployeesCsv(user: AuthUser, csv: string, dryRun: boolean) {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new ApiError(400, "CSV needs a header and at least one row");
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const required = ["fullname", "email", "department", "designation", "joindate", "basicsalary"];
  const issues: CsvIssue[] = [];
  const parsed: Record<string, string>[] = [];
  const depts = await prisma.department.findMany();
  const desigs = await prisma.designation.findMany();
  lines.slice(1).forEach((line, i) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    parsed.push(row);
    const rowNo = i + 2;
    required.forEach((field) => {
      if (!row[field]) issues.push({ row: rowNo, field, reason: "Required" });
    });
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      issues.push({ row: rowNo, field: "email", reason: "Invalid email" });
    }
    if (row.joindate && Number.isNaN(Date.parse(row.joindate))) {
      issues.push({ row: rowNo, field: "joindate", reason: "Use ISO date YYYY-MM-DD" });
    }
    if (row.basicsalary && !(Number(row.basicsalary) > 0)) {
      issues.push({ row: rowNo, field: "basicsalary", reason: "Salary must be > 0" });
    }
    if (row.department && !depts.some((d) => d.name.toLowerCase() === row.department.toLowerCase())) {
      issues.push({ row: rowNo, field: "department", reason: "Unknown department" });
    }
    if (row.designation && !desigs.some((d) => d.name.toLowerCase() === row.designation.toLowerCase())) {
      issues.push({ row: rowNo, field: "designation", reason: "Unknown designation" });
    }
  });
  const emails = parsed.map((p) => p.email.toLowerCase()).filter(Boolean);
  const existing = await prisma.employee.findMany({ where: { email: { in: emails } } });
  existing.forEach((e) => {
    const rowNo = parsed.findIndex((p) => p.email.toLowerCase() === e.email) + 2;
    issues.push({ row: rowNo, field: "email", reason: "Email already exists" });
  });
  if (dryRun || issues.length) return { dryRun: true, issues, wouldImport: parsed.length };
  const created = [];
  for (const row of parsed) {
    const department = depts.find((d) => d.name.toLowerCase() === row.department.toLowerCase())!;
    const designation = desigs.find((d) => d.name.toLowerCase() === row.designation.toLowerCase())!;
    created.push(
      await registerEmployee(user, {
        fullName: row.fullname,
        email: row.email,
        departmentId: department.id,
        designationId: designation.id,
        joinDate: row.joindate,
        basicSalary: Number(row.basicsalary),
        phone: row.phone,
        gender: row.gender,
      }),
    );
  }
  return { dryRun: false, issues: [], imported: created.length };
}

export async function exportEmployeesCsv() {
  const rows = await prisma.employee.findMany({ include: { department: true, designation: true } });
  const header = "code,fullName,email,phone,department,designation,joinDate,basicSalary,status";
  const body = rows
    .map((e) =>
      [
        e.code,
        e.fullName,
        e.email,
        e.phone,
        e.department.name,
        e.designation.name,
        e.joinDate.toISOString().slice(0, 10),
        e.basicSalary,
        e.status,
      ].join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
}

async function resolveEmployeeForPunch(user: AuthUser) {
  if (user.role === "ADMIN") throw new ApiError(403, "Admin cannot check in");
  const id = user.role === "EMPLOYEE" ? ownEmployeeId(user) : user.employeeId;
  if (user.role === "HR") {
    const hrEmp = await prisma.employee.findFirst({ where: { userId: user.id } });
    if (!hrEmp) throw new ApiError(400, "HR check-in needs an employee profile. Register this HR as staff or use an employee login.");
    return hrEmp;
  }
  const emp = await prisma.employee.findUnique({ where: { id: id! } });
  if (!emp) throw new ApiError(404, "Employee not found");
  return emp;
}

export async function checkIn(
  user: AuthUser,
  input?: { source?: string; lat?: number; lng?: number; accuracy?: number; faceCount?: number },
) {
  const company = await companyOrThrow();
  const employee = await resolveEmployeeForPunch(user);
  const date = todayISO();
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date } },
  });
  if (existing?.checkIn) throw new ApiError(409, "Already checked in today");
  if (input?.source === "camera") {
    if (input.faceCount !== 1) throw new ApiError(400, "Camera check-in needs exactly one face");
    if (input.accuracy != null && input.accuracy > 100) {
      throw new ApiError(400, "GPS accuracy is worse than 100 m");
    }
    if (company.officeLat == null || company.officeLng == null) {
      throw new ApiError(400, "Admin has not set the office location");
    }
    if (input.lat == null || input.lng == null) throw new ApiError(400, "Location is required");
    const distance = haversineMeters(company.officeLat, company.officeLng, input.lat, input.lng);
    if (distance > company.radiusMeters) {
      throw new ApiError(400, `Outside office radius (${Math.round(distance)} m)`);
    }
  }
  const now = new Date();
  const status = attendanceStatus(now, null, company);
  const row = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: employee.id, date } },
    update: { checkIn: now, status, source: input?.source || "web" },
    create: {
      employeeId: employee.id,
      date,
      checkIn: now,
      status,
      source: input?.source || "web",
    },
  });
  await audit(user, "check_in", "attendance", row.id, null, row);
  return row;
}

export async function checkOut(user: AuthUser) {
  const company = await companyOrThrow();
  const employee = await resolveEmployeeForPunch(user);
  const date = todayISO();
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date } },
  });
  if (!existing?.checkIn) throw new ApiError(400, "Check in first");
  if (existing.checkOut) throw new ApiError(409, "Already checked out");
  const now = new Date();
  const status = attendanceStatus(existing.checkIn, now, company);
  const row = await prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOut: now, status },
  });
  await audit(user, "check_out", "attendance", row.id, existing, row);
  return row;
}

export async function attendanceBoard(user: AuthUser, date = todayISO()) {
  const company = await companyOrThrow();
  const holidays = await holidaySet();
  const own = ownEmployeeId(user);
  const employees = await prisma.employee.findMany({
    where: own
      ? { id: own }
      : { status: { in: ["ACTIVE", "PROBATION"] } },
    include: { department: true },
    orderBy: { fullName: "asc" },
  });
  const records = await prisma.attendance.findMany({
    where: { date, employeeId: { in: employees.map((e) => e.id) } },
  });
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      startDate: { lte: date },
      endDate: { gte: date },
      employeeId: { in: employees.map((e) => e.id) },
    },
  });
  const leaveSet = new Set(leaves.map((l) => l.employeeId));
  const byEmp = new Map(records.map((r) => [r.employeeId, r]));
  const weekend = company.weekend;
  const isOff = holidays.has(date) || weekend.split(",").map(Number).includes(new Date(`${date}T12:00:00`).getDay());
  return employees.map((emp) => {
    const rec = byEmp.get(emp.id);
    let status = rec?.status ?? (leaveSet.has(emp.id) ? "ON_LEAVE" : isOff ? "OFF" : "ABSENT");
    if (!rec && leaveSet.has(emp.id)) status = "ON_LEAVE";
    return {
      employeeId: emp.id,
      name: emp.fullName,
      code: emp.code,
      department: emp.department.name,
      date,
      status,
      checkIn: rec?.checkIn ?? null,
      checkOut: rec?.checkOut ?? null,
      source: rec?.source ?? null,
    };
  });
}

export async function requestCorrection(
  user: AuthUser,
  input: { date: string; reason: string; requestedIn?: string; requestedOut?: string },
) {
  const employeeId = ownEmployeeId(user) || (await resolveEmployeeForPunch(user)).id;
  if (user.role === "ADMIN") throw new ApiError(403, "Admin cannot request corrections");
  const attendance = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: input.date } },
  });
  const row = await prisma.attendanceCorrection.create({
    data: {
      employeeId,
      attendanceId: attendance?.id,
      date: input.date,
      reason: input.reason,
      requestedIn: input.requestedIn,
      requestedOut: input.requestedOut,
    },
  });
  await audit(user, "create", "attendanceCorrection", row.id, null, row);
  return row;
}

export async function decideCorrection(
  user: AuthUser,
  id: string,
  status: "APPROVED" | "REJECTED",
  comment: string,
) {
  const row = await prisma.attendanceCorrection.findUnique({ where: { id } });
  if (!row) throw new ApiError(404, "Correction not found");
  const company = await companyOrThrow();
  const updated = await prisma.attendanceCorrection.update({
    where: { id },
    data: { status, comment },
  });
  if (status === "APPROVED") {
    const checkIn = row.requestedIn ? new Date(row.requestedIn) : null;
    const checkOut = row.requestedOut ? new Date(row.requestedOut) : null;
    const attStatus = attendanceStatus(checkIn, checkOut, company);
    await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: row.employeeId, date: row.date } },
      update: { checkIn, checkOut, status: attStatus, notes: comment },
      create: {
        employeeId: row.employeeId,
        date: row.date,
        checkIn,
        checkOut,
        status: attStatus,
        source: "correction",
        notes: comment,
      },
    });
  }
  const emp = await prisma.employee.findUnique({ where: { id: row.employeeId } });
  if (emp?.userId) {
    await notify(emp.userId, "Attendance correction", `Your correction for ${row.date} was ${status.toLowerCase()}.`);
  }
  await audit(user, status.toLowerCase(), "attendanceCorrection", id, row, updated);
  return updated;
}

function yearStartEnd(date = new Date()) {
  const y = date.getFullYear();
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

export async function leaveBalance(user: AuthUser, employeeId?: string) {
  const id = user.role === "EMPLOYEE" ? ownEmployeeId(user)! : employeeId;
  if (!id) throw new ApiError(400, "employeeId is required");
  if (user.role === "EMPLOYEE" && id !== user.employeeId) throw new ApiError(403, "Own data only");
  const { start, end } = yearStartEnd();
  const types = await prisma.leaveType.findMany();
  const approved = await prisma.leaveRequest.findMany({
    where: { employeeId: id, status: "APPROVED", startDate: { lte: end }, endDate: { gte: start } },
  });
  return types.map((t) => {
    const used = approved.filter((a) => a.leaveTypeId === t.id).reduce((s, a) => s + a.days, 0);
    return {
      leaveTypeId: t.id,
      name: t.name,
      quota: t.unlimited ? null : t.quota,
      used,
      remaining: t.unlimited ? null : t.quota - used,
      unlimited: t.unlimited,
    };
  });
}

export async function applyLeave(
  user: AuthUser,
  input: { leaveTypeId: string; startDate: string; endDate: string; reason: string; employeeId?: string },
) {
  const employeeId = user.role === "EMPLOYEE" ? ownEmployeeId(user)! : input.employeeId || (await resolveEmployeeForPunch(user)).id;
  if (input.endDate < input.startDate) throw new ApiError(400, "End date must be after start date");
  const company = await companyOrThrow();
  const holidays = await holidaySet();
  const days = workingDates(input.startDate, input.endDate, company.weekend, holidays).length;
  if (days <= 0) throw new ApiError(422, "Selected range has no working days");
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
    },
  });
  if (overlap) throw new ApiError(422, "Overlapping leave request exists");
  const type = await prisma.leaveType.findUnique({ where: { id: input.leaveTypeId } });
  if (!type) throw new ApiError(400, "Unknown leave type");
  if (!type.unlimited) {
    const balances = await leaveBalance(user, employeeId);
    const bal = balances.find((b) => b.leaveTypeId === type.id);
    if (bal && bal.remaining != null && days > bal.remaining) {
      throw new ApiError(422, "Leave would exceed remaining balance");
    }
  }
  const row = await prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveTypeId: input.leaveTypeId,
      startDate: input.startDate,
      endDate: input.endDate,
      days,
      reason: input.reason,
    },
    include: { leaveType: true, employee: true },
  });
  await audit(user, "create", "leave", row.id, null, row);
  return row;
}

export async function cancelLeave(user: AuthUser, id: string) {
  const row = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!row) throw new ApiError(404, "Leave not found");
  if (user.role === "EMPLOYEE" && row.employeeId !== user.employeeId) {
    throw new ApiError(403, "Own leave only");
  }
  if (row.status !== "PENDING") throw new ApiError(400, "Only pending leave can be cancelled");
  const updated = await prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
  await audit(user, "cancel", "leave", id, row, updated);
  return updated;
}

export async function decideLeave(
  user: AuthUser,
  id: string,
  status: "APPROVED" | "REJECTED",
  comment: string,
) {
  const row = await prisma.leaveRequest.findUnique({ where: { id }, include: { employee: true } });
  if (!row) throw new ApiError(404, "Leave not found");
  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status, comment },
  });
  if (row.employee.userId) {
    await notify(
      row.employee.userId,
      "Leave decision",
      `Your leave ${row.startDate} to ${row.endDate} was ${status.toLowerCase()}. ${comment}`.trim(),
    );
  }
  await audit(user, status.toLowerCase(), "leave", id, row, updated);
  return updated;
}

export async function listLeave(user: AuthUser) {
  const own = ownEmployeeId(user);
  return prisma.leaveRequest.findMany({
    where: own ? { employeeId: own } : {},
    include: { employee: true, leaveType: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPayrollDraft(user: AuthUser, year: number, month: number) {
  const existing = await prisma.payrollRun.findUnique({ where: { year_month: { year, month } } });
  if (existing?.status === "FINALIZED") throw new ApiError(400, "This month is finalized and locked");
  const company = await companyOrThrow();
  const holidays = await holidaySet();
  const { start, end } = monthRange(year, month);
  const monthWorking = workingDates(start, end, company.weekend, holidays);
  const employees = await prisma.employee.findMany({
    where: { status: { in: ["ACTIVE", "PROBATION", "EXITED"] } },
    include: { department: true, designation: true },
  });
  const attendance = await prisma.attendance.findMany({
    where: { date: { gte: start, lte: end } },
  });
  const leaves = await prisma.leaveRequest.findMany({
    where: { status: "APPROVED", startDate: { lte: end }, endDate: { gte: start }, leaveType: { unlimited: true } },
    include: { leaveType: true },
  });
  const run = existing
    ? await prisma.payrollRun.update({ where: { id: existing.id }, data: { status: "DRAFT" } })
    : await prisma.payrollRun.create({ data: { year, month } });
  await prisma.payslip.deleteMany({ where: { runId: run.id } });
  const slips = [];
  for (const emp of employees) {
    const join = emp.joinDate.toISOString().slice(0, 10);
    const exit = emp.exitDate?.toISOString().slice(0, 10);
    const expected = monthWorking.filter((d) => d >= join && (!exit || d <= exit));
    if (!expected.length) continue;
    const att = attendance.filter((a) => a.employeeId === emp.id);
    const halfDays = att.filter((a) => a.status === "HALF_DAY").length;
    const presentish = att.filter((a) =>
      ["PRESENT", "LATE", "MISSING_CHECKOUT", "HALF_DAY"].includes(a.status),
    ).length;
    const unpaid = leaves
      .filter((l) => l.employeeId === emp.id)
      .reduce((sum, l) => {
        const days = workingDates(
          l.startDate < start ? start : l.startDate,
          l.endDate > end ? end : l.endDate,
          company.weekend,
          holidays,
        ).length;
        return sum + days;
      }, 0);
    const absentDays = Math.max(0, expected.length - presentish - unpaid);
    const gross = grossFromBasic(emp.basicSalary);
    const perDay = expected.length ? gross / expected.length : 0;
    const deductUnits = absentDays + unpaid + 0.5 * halfDays;
    const deductions = perDay * deductUnits;
    const tax = annualTax(gross * 12) / 12;
    const net = Math.max(0, gross - deductions - tax);
    slips.push(
      await prisma.payslip.create({
        data: {
          runId: run.id,
          employeeId: emp.id,
          basic: emp.basicSalary,
          gross,
          workingDays: expected.length,
          absentDays,
          unpaidDays: unpaid,
          halfDays,
          deductions,
          annualTax: annualTax(gross * 12),
          tax,
          net,
        },
      }),
    );
  }
  await audit(user, "create", "payroll", run.id, null, { year, month, slips: slips.length });
  return getPayroll(user, run.id);
}

export async function getPayroll(user: AuthUser, id?: string, year?: number, month?: number) {
  const run = id
    ? await prisma.payrollRun.findUnique({ where: { id } })
    : year && month
      ? await prisma.payrollRun.findUnique({ where: { year_month: { year, month } } })
      : await prisma.payrollRun.findFirst({ orderBy: { createdAt: "desc" } });
  if (!run) return null;
  const own = ownEmployeeId(user);
  const payslips = await prisma.payslip.findMany({
    where: { runId: run.id, ...(own ? { employeeId: own } : {}) },
    include: { employee: { include: { department: true, designation: true } } },
    orderBy: { employee: { fullName: "asc" } },
  });
  return { ...run, payslips };
}

export async function listPayrollRuns(user: AuthUser) {
  const runs = await prisma.payrollRun.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }] });
  if (user.role !== "EMPLOYEE") return runs;
  return runs.filter((r) => r.status === "FINALIZED");
}

export async function finalizePayroll(user: AuthUser, id: string) {
  const run = await prisma.payrollRun.findUnique({ where: { id }, include: { payslips: { include: { employee: true } } } });
  if (!run) throw new ApiError(404, "Payroll run not found");
  if (run.status === "FINALIZED") throw new ApiError(400, "Already finalized");
  const updated = await prisma.payrollRun.update({ where: { id }, data: { status: "FINALIZED" } });
  for (const slip of run.payslips) {
    if (slip.employee.userId) {
      await notify(slip.employee.userId, "Payslip ready", `Your payslip for ${run.month}/${run.year} is available.`);
    }
  }
  await audit(user, "finalize", "payroll", id, run, updated);
  return updated;
}

export async function dashboards(
  user: AuthUser,
  filters: { from?: string; to?: string; departmentId?: string },
) {
  const company = await companyOrThrow();
  const from = filters.from || todayISO();
  const to = filters.to || todayISO();
  const holidays = await holidaySet();
  const empWhere: Record<string, unknown> = {};
  if (filters.departmentId) empWhere.departmentId = filters.departmentId;
  if (user.role === "EMPLOYEE") empWhere.id = ownEmployeeId(user);
  const employees = await prisma.employee.findMany({
    where: empWhere,
    include: { department: true, designation: true },
  });
  const ids = employees.map((e) => e.id);
  const attendance = await prisma.attendance.findMany({
    where: { employeeId: { in: ids }, date: { gte: from, lte: to } },
  });
  const leaves = await prisma.leaveRequest.findMany({
    where: { employeeId: { in: ids } },
    include: { leaveType: true, employee: true },
  });
  const today = todayISO();
  const todayBoard = await attendanceBoard(user, today);
  const working = workingDates(from, to, company.weekend, holidays);
  const presentish = attendance.filter((a) =>
    ["PRESENT", "LATE", "MISSING_CHECKOUT", "HALF_DAY"].includes(a.status),
  );
  const late = attendance.filter((a) => a.status === "LATE");
  const half = attendance.filter((a) => a.status === "HALF_DAY");
  const onLeaveToday = todayBoard.filter((r) => r.status === "ON_LEAVE").length;
  const expectedRecords = employees.length * working.length;
  const attendanceRate =
    expectedRecords === 0
      ? 0
      : (presentish.length - half.length * 0.5) / Math.max(1, expectedRecords - onLeaveToday);
  const lateByEmp = new Map<string, number>();
  late.forEach((a) => lateByEmp.set(a.employeeId, (lateByEmp.get(a.employeeId) || 0) + 1));
  const topLate = [...lateByEmp.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      name: employees.find((e) => e.id === id)?.fullName || id,
      count,
    }));
  const active = employees.filter((e) => e.status === "ACTIVE" || e.status === "PROBATION");
  const exits = employees.filter((e) => e.status === "EXITED");
  const attrition =
    active.length === 0 ? 0 : (exits.length / Math.max(1, (active.length + exits.length) / 2)) * 100;
  const payroll = await prisma.payslip.findMany({
    where: { employeeId: { in: ids } },
  });
  const payrollCost = payroll.reduce((s, p) => s + p.net, 0);
  const avgSalary =
    active.length === 0 ? 0 : active.reduce((s, e) => s + grossFromBasic(e.basicSalary), 0) / active.length;
  const byDept: Record<string, { headcount: number; payroll: number; late: number; absent: number }> = {};
  employees.forEach((e) => {
    const key = e.department.name;
    byDept[key] ||= { headcount: 0, payroll: 0, late: 0, absent: 0 };
    if (e.status === "ACTIVE" || e.status === "PROBATION") byDept[key].headcount += 1;
  });
  const pendingLeave = await prisma.leaveRequest.count({
    where: { status: "PENDING", ...(user.role === "EMPLOYEE" ? { employeeId: user.employeeId || "" } : {}) },
  });
  const pendingCorr = await prisma.attendanceCorrection.count({
    where: { status: "PENDING", ...(user.role === "EMPLOYEE" ? { employeeId: user.employeeId || "" } : {}) },
  });
  let personal = null;
  if (user.role === "EMPLOYEE" && user.employeeId) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekDates = eachDate(weekAgo.toISOString().slice(0, 10), today);
    const weekAtt = attendance.filter((a) => weekDates.includes(a.date) && a.employeeId === user.employeeId);
    const hours = weekAtt.reduce((s, a) => {
      if (!a.checkIn || !a.checkOut) return s;
      return s + (a.checkOut.getTime() - a.checkIn.getTime()) / 36e5;
    }, 0);
    const lastSlip = await prisma.payslip.findFirst({
      where: { employeeId: user.employeeId, run: { status: "FINALIZED" } },
      include: { run: true },
      orderBy: { run: { createdAt: "desc" } },
    });
    personal = {
      hoursThisWeek: Number(hours.toFixed(2)),
      lateCount: late.filter((l) => l.employeeId === user.employeeId).length,
      lastPayslip: lastSlip,
      today: todayBoard[0] || null,
      balance: await leaveBalance(user, user.employeeId),
    };
  }
  return {
    role: user.role,
    kpis: {
      headcount: active.length,
      presentToday: todayBoard.filter((r) => ["PRESENT", "LATE", "MISSING_CHECKOUT", "HALF_DAY"].includes(r.status)).length,
      onLeaveToday,
      lateToday: todayBoard.filter((r) => r.status === "LATE").length,
      pendingApprovals: pendingLeave + pendingCorr,
      attritionYtd: Number(attrition.toFixed(1)),
      payrollCost,
      avgSalary,
      attendanceRate: Number((attendanceRate * 100).toFixed(1)),
    },
    topLate,
    byDept,
    leaveByType: Object.values(
      leaves
        .filter((l) => l.status === "APPROVED")
        .reduce(
          (acc: Record<string, { name: string; days: number }>, l) => {
            acc[l.leaveType.name] ||= { name: l.leaveType.name, days: 0 };
            acc[l.leaveType.name].days += l.days;
            return acc;
          },
          {},
        ),
    ),
    gender: {
      male: employees.filter((e) => e.gender.toLowerCase() === "male").length,
      female: employees.filter((e) => e.gender.toLowerCase() === "female").length,
      other: employees.filter((e) => e.gender && !["male", "female"].includes(e.gender.toLowerCase())).length,
    },
    personal,
    announcements: await prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  };
}

export async function postAnnouncement(user: AuthUser, title: string, body: string) {
  const row = await prisma.announcement.create({
    data: { title, body, authorId: user.id },
  });
  const users = await prisma.user.findMany({ where: { active: true } });
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      title: "Announcement",
      body: title,
    })),
  });
  await audit(user, "create", "announcement", row.id, null, row);
  return row;
}

export async function myNotifications(user: AuthUser) {
  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(user: AuthUser, id: string) {
  return prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });
}

export async function auditFeed() {
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
}

export async function aiTools(user: AuthUser) {
  const dash = await dashboards(user, {});
  return {
    get_headcount: async (args: { department?: string }) => {
      const employees = await prisma.employee.findMany({
        where: {
          status: { in: ["ACTIVE", "PROBATION"] },
          ...(user.role === "EMPLOYEE" ? { id: user.employeeId || "" } : {}),
          ...(args.department
            ? { department: { name: { contains: args.department } } }
            : {}),
        },
        include: { department: true },
      });
      return { count: employees.length, names: employees.map((e) => `${e.fullName} (${e.department.name})`) };
    },
    get_attendance_summary: async () => ({
      attendanceRate: dash.kpis.attendanceRate,
      presentToday: dash.kpis.presentToday,
      lateToday: dash.kpis.lateToday,
      onLeaveToday: dash.kpis.onLeaveToday,
    }),
    get_late_comers: async () => dash.topLate,
    get_leave_summary: async () => dash.leaveByType,
    get_my_leave_balance: async () => {
      if (!user.employeeId && user.role === "EMPLOYEE") return { error: "No employee profile" };
      if (user.role === "EMPLOYEE") return leaveBalance(user, user.employeeId!);
      return { note: "Ask with an employee context, or use HR leave list." };
    },
    get_payroll_summary: async () => ({
      payrollCost: dash.kpis.payrollCost,
      avgSalary: dash.kpis.avgSalary,
    }),
    search_employees: async (args: { q?: string }) => {
      if (user.role === "EMPLOYEE") {
        return { error: "Employees can only see their own record." };
      }
      const list = await listEmployees(user, { q: args.q, pageSize: 10 });
      return list.items.map((e) => ({
        code: e.code,
        name: e.fullName,
        department: e.department.name,
        status: e.status,
      }));
    },
  };
}
