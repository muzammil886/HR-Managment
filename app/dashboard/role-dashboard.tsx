"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Building2, CalendarCheck, Users, Wallet } from "lucide-react";
import AppShell from "../components/layout/dashboard-shell";
import { useAuth } from "../providers";
import { api, roleHome, type Role } from "@/lib/client";

type Dashboard = {
  kpis: { headcount: number; presentToday: number; onLeaveToday: number; lateToday: number; pendingApprovals: number; attritionYtd: number; payrollCost: number; avgSalary: number; attendanceRate: number };
  topLate: { name: string; count: number }[];
  byDept: Record<string, { headcount: number; payroll: number; late: number; absent: number }>;
  leaveByType: { name: string; days: number }[];
  personal: null | { hoursThisWeek: number; lateCount: number; balance: { name: string; remaining: number | null; unlimited: boolean }[] };
  announcements: { id: string; title: string; body: string; createdAt: string }[];
};
type Summary = { answer: string };
type Department = { id: string; name: string };

const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 8)}01`;
const links: { href: string; title: string; description: string; roles: Role[] }[] = [
  { href: "/employees", title: "Employees", description: "Employee directory and profile records.", roles: ["ADMIN", "HR"] },
  { href: "/profile", title: "My profile", description: "Your personal information and work details.", roles: ["EMPLOYEE"] },
  { href: "/attendance", title: "Attendance", description: "Check-ins, daily board and corrections.", roles: ["ADMIN", "HR", "EMPLOYEE"] },
  { href: "/payroll", title: "Payroll", description: "Payroll runs and payslips.", roles: ["ADMIN", "HR", "EMPLOYEE"] },
  { href: "/departments", title: "Departments", description: "Company organization structure.", roles: ["ADMIN"] },
];

export default function RoleDashboard({ expectedRole }: { expectedRole: Role }) {
  const router = useRouter();
  const { user } = useAuth();
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<Dashboard | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!user || user.role !== expectedRole) {
      if (user) router.replace(roleHome[user.role]);
      return () => { active = false; };
    }
    Promise.all([
      api<Dashboard>(`/api/dashboards?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${departmentId ? `&departmentId=${encodeURIComponent(departmentId)}` : ""}`),
      api<{ departments: Department[] }>("/api/org"),
    ])
      .then(([result, org]) => { if (active) { setData(result); setDepartments(org.departments); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load dashboard."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to, departmentId, user, expectedRole, router]);

  async function summarize() {
    setError("");
    try {
      const result = await api<Summary>("/api/ai/summarize", { method: "POST", body: JSON.stringify({ from, to, departmentId: departmentId || undefined }) });
      setSummary(result.answer);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not summarize dashboard."); }
  }

  const kpis = data?.kpis;
  const cards = user?.role === "ADMIN"
    ? [{ title: "Headcount", value: kpis?.headcount ?? 0, icon: Users }, { title: "Attrition YTD", value: `${kpis?.attritionYtd ?? 0}%`, icon: ArrowUpRight }, { title: "Payroll cost", value: `Rs ${(kpis?.payrollCost ?? 0).toLocaleString("en-PK")}`, icon: Wallet }, { title: "Average salary", value: `Rs ${(kpis?.avgSalary ?? 0).toLocaleString("en-PK")}`, icon: Building2 }]
    : user?.role === "EMPLOYEE"
      ? [{ title: "Hours this week", value: data?.personal?.hoursThisWeek ?? 0, icon: CalendarCheck }, { title: "Late count", value: data?.personal?.lateCount ?? 0, icon: ArrowUpRight }, { title: "Leave balance types", value: data?.personal?.balance?.length ?? 0, icon: Users }, { title: "Announcements", value: data?.announcements.length ?? 0, icon: Building2 }]
      : [{ title: "Headcount", value: kpis?.headcount ?? 0, icon: Users }, { title: "Present today", value: kpis?.presentToday ?? 0, icon: CalendarCheck }, { title: "On leave", value: kpis?.onLeaveToday ?? 0, icon: Building2 }, { title: "Pending approvals", value: kpis?.pendingApprovals ?? 0, icon: Wallet }];

  if (!user || user.role !== expectedRole) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-[#8490a5]">Opening your {expectedRole.toLowerCase()} panel…</main>;
  }

  return <AppShell><div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-[#8993a7]">Workspace / {expectedRole}</p><h1 className="mt-2 text-2xl font-extrabold text-[#18302e]">{expectedRole === "EMPLOYEE" ? "Employee panel" : expectedRole === "ADMIN" ? "Admin panel" : "HR panel"}</h1><p className="mt-2 text-sm text-[#8993a7]">{expectedRole === "EMPLOYEE" ? "Your attendance, leave and payslip overview." : "Metrics are computed from records entered in HCM Lite."}</p></div><div className="flex flex-wrap gap-2"><label className="text-xs text-[#8993a7]">From<input type="date" value={from} onChange={(event) => { setLoading(true); setFrom(event.target.value); }} className="ml-2 rounded-xl border px-3 py-2.5 text-sm text-[#536078]" /></label><label className="text-xs text-[#8993a7]">To<input type="date" value={to} onChange={(event) => { setLoading(true); setTo(event.target.value); }} className="ml-2 rounded-xl border px-3 py-2.5 text-sm text-[#536078]" /></label>{user.role !== "EMPLOYEE" && <select aria-label="Filter by department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">All departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>}</div></div>
    {error && <p role="alert" className="rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b94b4b]">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ title, value, icon: Icon }) => <div key={title} className="premium-card p-5"><div className="flex items-center justify-between"><p className="text-sm text-[#8993a7]">{title}</p><Icon size={20} className="text-[#147d72]" /></div><p className="mt-5 break-words text-2xl font-extrabold text-[#18302e]">{loading ? "…" : value}</p></div>)}</div>
    {user?.role !== "EMPLOYEE" && <section className="premium-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-[#18302e]">AI dashboard summary</h2><p className="mt-1 text-xs text-[#8993a7]">Uses only the selected dashboard metrics.</p></div><button onClick={() => void summarize()} className="rounded-xl bg-[#147d72] px-4 py-2.5 text-sm font-bold text-white">Summarize</button></div>{summary && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#536078]">AI-generated · {summary}</p>}</section>}
    {user?.role !== "EMPLOYEE" && <section className="premium-card p-5"><h2 className="font-bold text-[#18302e]">Department headcount</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(data?.byDept ?? {}).map(([name, metrics]) => <div key={name} className="rounded-xl border border-[#edf0f6] p-4"><p className="text-sm text-[#8993a7]">{name}</p><p className="mt-2 text-xl font-bold text-[#18302e]">{metrics.headcount}</p><p className="text-xs text-[#929cb0]">active employees</p></div>)}</div>{!loading && !Object.keys(data?.byDept ?? {}).length && <p className="mt-3 text-sm text-[#8993a7]">No departments or employees have been added yet.</p>}</section>}
    {data?.personal?.balance && <section className="premium-card p-5"><h2 className="font-bold text-[#18302e]">My leave balance</h2><div className="mt-4 flex flex-wrap gap-3">{data.personal.balance.map((balance) => <div key={balance.name} className="rounded-xl border border-[#edf0f6] px-4 py-3"><p className="text-xs text-[#8993a7]">{balance.name}</p><p className="mt-1 font-bold text-[#18302e]">{balance.unlimited ? "Unlimited" : `${balance.remaining} days`}</p></div>)}</div></section>}
    {data?.announcements.length ? <section className="premium-card p-5"><h2 className="font-bold text-[#18302e]">Announcements</h2><div className="mt-4 space-y-3">{data.announcements.map((item) => <article key={item.id} className="border-t border-[#edf0f6] pt-3"><p className="font-semibold text-[#344057]">{item.title}</p><p className="mt-1 text-sm text-[#69758b]">{item.body}</p></article>)}</div></section> : null}
    <section className="premium-card p-5"><h2 className="text-lg font-bold text-[#18302e]">{expectedRole === "EMPLOYEE" ? "My workspace" : "Team workspace"}</h2><p className="mt-2 text-sm text-[#8993a7]">Daily people operations backed by your company data.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{links.filter((item) => item.roles.includes(expectedRole)).map((item) => <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-2xl border border-[#edf0f6] p-4 hover:bg-[#f7f7ff]"><div><p className="font-semibold text-[#273249]">{item.title}</p><p className="mt-1 text-sm text-[#8993a7]">{item.description}</p></div><ArrowUpRight size={18} className="text-[#147d72]" /></Link>)}</div></section>
  </div></AppShell>;
}
