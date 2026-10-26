"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, UserPlus, Users } from "lucide-react";
import AppShell from "../components/layout/dashboard-shell";
import { useAuth } from "../providers";
import { api } from "@/lib/client";

type Department = { id: string; name: string };
type Designation = { id: string; name: string };
type Employee = { id: string; code: string; fullName: string; email: string; status: string; department: Department; designation: Designation };
type Directory = { total: number; items: Employee[] };
type Org = { departments: Department[]; designations: Designation[] };
type CsvResult = { dryRun: boolean; issues: { row: number; field: string; reason: string }[]; wouldImport?: number; imported?: number };

export default function EmployeesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [org, setOrg] = useState<Org>({ departments: [], designations: [] });
  const [directory, setDirectory] = useState<Directory>({ total: 0, items: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [salary, setSalary] = useState("");
  const [joinDate, setJoinDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDepartment, setNewDepartment] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [csv, setCsv] = useState("");
  const [csvResult, setCsvResult] = useState<CsvResult | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [result, organization] = await Promise.all([
        api<Directory>(`/api/employees?pageSize=50${search ? `&q=${encodeURIComponent(search)}` : ""}${departmentId ? `&departmentId=${encodeURIComponent(departmentId)}` : ""}`),
        api<Org>("/api/org"),
      ]);
      setDirectory(result);
      setOrg(organization);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load employees.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const query = `/api/employees?pageSize=50${search ? `&q=${encodeURIComponent(search)}` : ""}${departmentId ? `&departmentId=${encodeURIComponent(departmentId)}` : ""}`;
    Promise.all([api<Directory>(query), api<Org>("/api/org")])
      .then(([result, organization]) => {
        if (!active) return;
        setDirectory(result);
        setOrg(organization);
        setError("");
      })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load employees."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, departmentId]);

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await api<{ temporaryPassword: string }>("/api/employees", {
        method: "POST",
        body: JSON.stringify({ fullName: name, email, phone, basicSalary: Number(salary), joinDate, departmentId: newDepartment, designationId: newDesignation }),
      });
      setTemporaryPassword(result.temporaryPassword);
      setName(""); setEmail(""); setPhone(""); setSalary("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register employee.");
    } finally {
      setSaving(false);
    }
  }

  async function importCsv(dryRun: boolean) {
    setSaving(true); setError("");
    try {
      const result = await api<CsvResult>("/api/employees/import", { method: "POST", body: JSON.stringify({ csv, dryRun }) });
      setCsvResult(result);
      if (!dryRun && result.imported) await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not import CSV."); }
    finally { setSaving(false); }
  }

  return (
    <AppShell>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-[#8993a7]">People / Directory</p><h1 className="mt-2 text-2xl font-extrabold text-[#18302e]">Employees</h1><p className="mt-2 text-sm text-[#8993a7]">Live employee records from your organization.</p></div><div className="rounded-xl bg-[#e8f5f0] px-4 py-3 text-sm font-semibold text-[#147d72]"><Users className="mr-2 inline" size={18} />{directory.total} employees</div></div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b94b4b]">{error}</p>}
      {temporaryPassword && <p className="mb-4 rounded-xl bg-[#e6f8f0] px-4 py-3 text-sm text-[#16865f]">Employee login created. Give them this temporary password securely: <strong>{temporaryPassword}</strong>. It must be changed at first sign-in.<button className="ml-3 underline" onClick={() => setTemporaryPassword("")}>Dismiss</button></p>}

      {user?.role === "HR" && <details className="premium-card mb-6 p-5"><summary className="cursor-pointer list-none font-bold text-[#147d72]"><UserPlus className="mr-2 inline" size={18} /> Register employee</summary><form onSubmit={register} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="rounded-xl border px-3 py-2.5 text-sm" /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-xl border px-3 py-2.5 text-sm" /><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="rounded-xl border px-3 py-2.5 text-sm" /><input required min="1" type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="Basic salary" className="rounded-xl border px-3 py-2.5 text-sm" /><input required type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} className="rounded-xl border px-3 py-2.5 text-sm" /><select required value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Select department</option>{org.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select><select required value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Select designation</option>{org.designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select><button disabled={saving} className="rounded-xl bg-[#147d72] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Creating…" : "Create employee login"}</button></form></details>}

      {user?.role === "HR" && <details className="premium-card mb-6 p-5"><summary className="cursor-pointer font-bold text-[#147d72]">CSV import / export</summary><p className="mt-2 text-xs text-[#8993a7]">Required headers: fullName,email,department,designation,joinDate,basicSalary. Dates must use YYYY-MM-DD.</p><input type="file" accept=".csv,text/csv" onChange={async (event) => { const file = event.target.files?.[0]; if (file) { setCsv(await file.text()); setCsvResult(null); } }} className="mt-3 block text-sm" /><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void importCsv(true)} disabled={saving || !csv} className="rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Check CSV</button><button onClick={() => void importCsv(false)} disabled={saving || !csv || !csvResult || csvResult.issues.length > 0} className="rounded-xl bg-[#147d72] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Import checked rows</button><button type="button" onClick={() => { const link = document.createElement("a"); link.href = "/api/employees/export"; link.download = "employees.csv"; link.click(); }} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Export CSV</button></div>{csvResult && <div className="mt-3 rounded-xl bg-[#fafbfe] p-3 text-sm"><p>{csvResult.issues.length ? `${csvResult.issues.length} issue(s) found.` : csvResult.dryRun ? `${csvResult.wouldImport} row(s) ready to import.` : `${csvResult.imported} employee(s) imported.`}</p>{csvResult.issues.map((issue, index) => <p key={`${issue.row}-${issue.field}-${index}`} className="mt-1 text-xs text-[#b94b4b]">Row {issue.row}, {issue.field}: {issue.reason}</p>)}</div>}</details>}

      <section className="premium-card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf0f6] p-5"><div><h2 className="font-bold text-[#18302e]">Employee directory</h2><p className="mt-1 text-xs text-[#8993a7]">Search is applied on the server.</p></div><div className="flex flex-wrap gap-3"><div className="flex items-center gap-2 rounded-xl border px-3 py-2.5"><Search size={17} className="text-[#929cb0]" /><input aria-label="Search employees" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or code" className="w-48 text-sm outline-none" /></div><select aria-label="Filter by department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">All departments</option>{org.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-[#fafbfe] text-xs text-[#929cb0]"><tr><th className="px-5 py-4">EMPLOYEE</th><th className="px-5 py-4">CODE</th><th className="px-5 py-4">DEPARTMENT</th><th className="px-5 py-4">STATUS</th><th className="px-5 py-4">DETAILS</th></tr></thead><tbody>{directory.items.map((employee) => <tr key={employee.id} className="border-t border-[#f0f2f7]"><td className="px-5 py-4"><p className="text-sm font-semibold text-[#273249]">{employee.fullName}</p><p className="mt-1 text-xs text-[#929cb0]">{employee.email}</p></td><td className="px-5 py-4 text-sm text-[#69758b]">{employee.code}</td><td className="px-5 py-4 text-sm text-[#69758b]">{employee.department.name}</td><td className="px-5 py-4 text-sm">{employee.status}</td><td className="px-5 py-4"><Link href={`/employees/${employee.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#147d72]">View <ArrowUpRight size={15} /></Link></td></tr>)}</tbody></table>{!loading && !directory.items.length && <p className="p-10 text-center text-sm text-[#8993a7]">No employees found. Register employees to populate the directory.</p>}{loading && <p className="p-6 text-center text-sm text-[#8993a7]">Loading…</p>}</div>
      </section>
    </AppShell>
  );
}
