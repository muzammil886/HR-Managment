"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Search, Users, Plus } from "lucide-react";
import AppShell from "../components/layout/dashboard-shell";
import { useAuth } from "../providers";
import { api } from "@/lib/client";

type Department = { id: string; name: string };
type Org = { departments: Department[] };

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const org = await api<Org>("/api/org");
      setDepartments(org.departments);
      setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load departments."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    api<Org>("/api/org").then((org) => { if (active) setDepartments(org.departments); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load departments."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function addDepartment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try { await api("/api/departments", { method: "POST", body: JSON.stringify({ name }) }); setName(""); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not create department."); }
    finally { setSaving(false); }
  }

  const filtered = useMemo(() => departments.filter((department) => department.name.toLowerCase().includes(search.trim().toLowerCase())), [departments, search]);

  return <AppShell>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-[#8993a7]">Organization / Structure</p><h1 className="mt-2 text-2xl font-extrabold text-[#18302e]">Departments</h1><p className="mt-2 text-sm text-[#8993a7]">Company departments loaded from the organization records.</p></div><div className="rounded-xl bg-[#e8f5f0] px-4 py-3 text-sm font-semibold text-[#147d72]"><Building2 className="mr-2 inline" size={18} />{departments.length} departments</div></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b94b4b]">{error}</p>}
    {user?.role === "ADMIN" && <form onSubmit={addDepartment} className="premium-card mb-5 flex flex-wrap gap-3 p-5"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="New department name" className="min-w-56 flex-1 rounded-xl border px-3 py-2.5 text-sm" /><button disabled={saving} className="rounded-xl bg-[#147d72] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Plus className="mr-1 inline" size={16} />{saving ? "Adding…" : "Add department"}</button></form>}
    <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#dfe9e5] bg-white px-4 py-3"><Search size={19} className="text-[#929cb0]" /><input aria-label="Search departments" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search departments..." className="w-full bg-transparent text-sm outline-none" /></div>
    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((department) => <article key={department.id} className="premium-card p-6"><div className="inline-flex rounded-2xl bg-[#e8f5f0] p-3 text-[#147d72]"><Building2 size={23} /></div><h2 className="mt-5 text-lg font-bold text-[#18302e]">{department.name}</h2><p className="mt-2 text-sm text-[#8993a7]">Department in this company.</p><div className="mt-5 flex items-center gap-2 border-t border-[#edf0f6] pt-5 text-xs text-[#929cb0]"><Users size={15} /> Headcount is available in the employee directory.</div></article>)}{loading && <p className="premium-card p-8 text-sm text-[#8993a7]">Loading departments…</p>}{!loading && !filtered.length && <div className="premium-card p-8 text-center text-sm text-[#8993a7] sm:col-span-2 xl:col-span-3">No departments found. Admins can add departments after setting up the company.</div>}</section>
  </AppShell>;
}
