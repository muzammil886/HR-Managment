"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/layout/dashboard-shell";
import { useAuth } from "../providers";
import { api } from "@/lib/client";

type Org = { company: { id: string; name: string; officeStart: string; graceMinutes: number; halfDayHours: number; weekend: string; officeLat: number | null; officeLng: number | null; radiusMeters: number }; departments: { id: string; name: string }[]; designations: { id: string; name: string }[]; leaveTypes: { id: string; name: string; quota: number; unlimited: boolean }[]; holidays: { id: string; date: string; name: string }[] };

export default function OrganizationPage() {
  const { user } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dept, setDept] = useState("");
  const [designation, setDesignation] = useState("");
  const [leaveName, setLeaveName] = useState("");
  const [quota, setQuota] = useState("14");
  const [unlimited, setUnlimited] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");

  async function load() { setOrg(await api<Org>("/api/org")); }
  useEffect(() => {
    let active = true;
    api<Org>("/api/org").then((result) => { if (active) setOrg(result); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load organization settings."); });
    return () => { active = false; };
  }, []);

  async function submit(path: string, payload: unknown) {
    if (user?.role !== "ADMIN") { setError("Only Admin can change organization settings."); return; }
    setBusy(true); setError(""); setNotice("");
    try { await api(path, { method: path === "/api/settings" ? "PUT" : "POST", body: JSON.stringify(payload) }); await load(); setNotice("Changes saved."); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save changes."); }
    finally { setBusy(false); }
  }

  function settingsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit("/api/settings", { name: form.get("name"), officeStart: form.get("officeStart"), graceMinutes: Number(form.get("graceMinutes")), halfDayHours: Number(form.get("halfDayHours")), weekend: form.get("weekend"), officeLat: form.get("officeLat") || null, officeLng: form.get("officeLng") || null, radiusMeters: Number(form.get("radiusMeters")) });
  }

  if (!org && !error) return <AppShell><p className="p-8 text-sm text-[#8993a7]">Loading organization…</p></AppShell>;
  return <AppShell><main className="space-y-6"><header><p className="text-sm text-[#8993a7]">Organization / Setup</p><h1 className="mt-2 text-2xl font-extrabold text-[#18302e]">Organization</h1><p className="mt-2 text-sm text-[#8993a7]">Company rules, departments, designations, leave types, and holidays.</p></header>
    {error && <p role="alert" className="rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b94b4b]">{error}</p>}{notice && <p className="rounded-xl bg-[#e6f8f0] px-4 py-3 text-sm text-[#16865f]">{notice}</p>}
    {org && <>
      <form onSubmit={settingsSubmit} className="premium-card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3"><h2 className="sm:col-span-2 lg:col-span-3 font-bold text-[#18302e]">Company settings</h2><label className="text-sm">Company name<input name="name" defaultValue={org.company.name} required className="mt-1 block w-full rounded-xl border px-3 py-2.5" /></label><label className="text-sm">Office start<input name="officeStart" type="time" defaultValue={org.company.officeStart} className="mt-1 block w-full rounded-xl border px-3 py-2.5" /></label><label className="text-sm">Grace minutes<input name="graceMinutes" type="number" min="0" defaultValue={org.company.graceMinutes} className="mt-1 block w-full rounded-xl border px-3 py-2.5" /></label><label className="text-sm">Half day under (hours)<input name="halfDayHours" type="number" min="0" step="0.5" defaultValue={org.company.halfDayHours} className="mt-1 block w-full rounded-xl border px-3 py-2.5" /></label><label className="text-sm">Weekend days (0=Sun, 6=Sat)<input name="weekend" defaultValue={org.company.weekend} className="mt-1 block w-full rounded-xl border px-3 py-2.5" /></label><label className="text-sm">Office latitude<input name="officeLat" type="number" step="any" defaultValue={org.company.officeLat ?? ""} className="mt-1 block w-full rounded-xl border px-3 py-2.5" /></label><label className="text-sm">Office longitude<input name="officeLng" type="number" step="any" defaultValue={org.company.officeLng ?? ""} className="mt-1 block w-full rounded-xl border px-3 py-2.5" /></label><label className="text-sm">Office radius (m)<input name="radiusMeters" type="number" min="1" defaultValue={org.company.radiusMeters} className="mt-1 block w-full rounded-xl border px-3 py-2.5" /></label>{user?.role === "ADMIN" && <button disabled={busy} className="rounded-xl bg-[#147d72] px-4 py-3 text-sm font-bold text-white">Save company settings</button>}</form>
      <section className="grid gap-5 lg:grid-cols-2"><div className="premium-card p-5"><h2 className="font-bold">Departments</h2><ul className="my-3 space-y-2 text-sm">{org.departments.map((item) => <li key={item.id}>{item.name}</li>)}</ul><form onSubmit={(event) => { event.preventDefault(); void submit("/api/departments", { name: dept }).then(() => setDept("")); }} className="flex gap-2"><input required value={dept} onChange={(event) => setDept(event.target.value)} placeholder="Department name" className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm" /><button disabled={busy} className="rounded-xl border px-3 text-sm font-semibold">Add</button></form></div>
      <div className="premium-card p-5"><h2 className="font-bold">Designations</h2><ul className="my-3 space-y-2 text-sm">{org.designations.map((item) => <li key={item.id}>{item.name}</li>)}</ul><form onSubmit={(event) => { event.preventDefault(); void submit("/api/designations", { name: designation }).then(() => setDesignation("")); }} className="flex gap-2"><input required value={designation} onChange={(event) => setDesignation(event.target.value)} placeholder="Designation name" className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm" /><button disabled={busy} className="rounded-xl border px-3 text-sm font-semibold">Add</button></form></div>
      <div className="premium-card p-5"><h2 className="font-bold">Leave types and quotas</h2><ul className="my-3 space-y-2 text-sm">{org.leaveTypes.map((item) => <li key={item.id}>{item.name} · {item.unlimited ? "Unlimited" : `${item.quota} days/year`}</li>)}</ul><form onSubmit={(event) => { event.preventDefault(); void submit("/api/leave-types", { name: leaveName, quota: Number(quota), unlimited }).then(() => setLeaveName("")); }} className="flex flex-wrap gap-2"><input required value={leaveName} onChange={(event) => setLeaveName(event.target.value)} placeholder="Leave type" className="min-w-36 flex-1 rounded-xl border px-3 py-2.5 text-sm" /><input type="number" min="0" value={quota} onChange={(event) => setQuota(event.target.value)} className="w-24 rounded-xl border px-3 py-2.5 text-sm" /><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={unlimited} onChange={(event) => setUnlimited(event.target.checked)} />Unlimited</label><button disabled={busy} className="rounded-xl border px-3 text-sm font-semibold">Add</button></form></div>
      <div className="premium-card p-5"><h2 className="font-bold">Public holidays</h2><ul className="my-3 space-y-2 text-sm">{org.holidays.map((item) => <li key={item.id}>{item.date} · {item.name}</li>)}</ul><form onSubmit={(event) => { event.preventDefault(); void submit("/api/holidays", { name: holidayName, date: holidayDate }).then(() => { setHolidayName(""); setHolidayDate(""); }); }} className="flex flex-wrap gap-2"><input required type="date" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} className="rounded-xl border px-3 py-2.5 text-sm" /><input required value={holidayName} onChange={(event) => setHolidayName(event.target.value)} placeholder="Holiday name" className="min-w-36 flex-1 rounded-xl border px-3 py-2.5 text-sm" /><button disabled={busy} className="rounded-xl border px-3 text-sm font-semibold">Add</button></form></div></section>
    </>}
  </main></AppShell>;
}
