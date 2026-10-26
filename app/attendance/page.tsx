"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Clock3, Search, Users } from "lucide-react";
import AppShell from "../components/layout/dashboard-shell";
import { useAuth } from "../providers";
import { api } from "@/lib/client";

type Attendance = { employeeId: string; name: string; code: string; department: string; date: string; status: string; checkIn: string | null; checkOut: string | null };
type Correction = { id: string; date: string; reason: string; requestedIn: string | null; requestedOut: string | null; status: string; comment: string; employee: { fullName: string; code: string } };

export default function AttendancePage() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<Attendance[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [correctionDate, setCorrectionDate] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [requestedIn, setRequestedIn] = useState("");
  const [requestedOut, setRequestedOut] = useState("");
  const [decisionComments, setDecisionComments] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      api<Attendance[]>(`/api/attendance?date=${encodeURIComponent(date)}`),
      api<Correction[]>("/api/attendance/corrections"),
    ])
      .then(([rows, requests]) => { if (active) { setRecords(rows); setCorrections(requests); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load attendance."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date]);

  async function mark(action: "check-in" | "check-out") {
    setBusy(true); setError("");
    try {
      await api(`/api/attendance/${action}`, { method: "POST", body: "{}" });
      const rows = await api<Attendance[]>(`/api/attendance?date=${encodeURIComponent(date)}`);
      setRecords(rows);
    } catch (err) { setError(err instanceof Error ? err.message : "Attendance action failed."); }
    finally { setBusy(false); }
  }

  async function requestCorrection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api("/api/attendance/corrections", { method: "POST", body: JSON.stringify({ date: correctionDate, reason: correctionReason, requestedIn: requestedIn || undefined, requestedOut: requestedOut || undefined }) });
      setCorrectionDate(""); setCorrectionReason(""); setRequestedIn(""); setRequestedOut("");
      setCorrections(await api<Correction[]>("/api/attendance/corrections"));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not request correction."); }
    finally { setBusy(false); }
  }

  async function decideCorrection(id: string, status: "APPROVED" | "REJECTED") {
    setBusy(true); setError("");
    try {
      await api(`/api/attendance/corrections/${id}/decide`, { method: "POST", body: JSON.stringify({ status, comment: decisionComments[id] || "" }) });
      setCorrections(await api<Correction[]>("/api/attendance/corrections"));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not decide correction."); }
    finally { setBusy(false); }
  }

  const filtered = useMemo(() => records.filter((record) =>
    `${record.name} ${record.code} ${record.department}`.toLowerCase().includes(search.trim().toLowerCase()) && (filter === "ALL" || record.status === filter),
  ), [records, search, filter]);
  const present = records.filter((record) => ["PRESENT", "LATE", "HALF_DAY", "MISSING_CHECKOUT"].includes(record.status)).length;
  const absent = records.filter((record) => record.status === "ABSENT").length;
  const leave = records.filter((record) => record.status === "ON_LEAVE").length;
  const own = records.find((record) => record.employeeId === user?.employeeId);

  return <AppShell>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-[#8993a7]">Workforce / Daily records</p><h1 className="mt-2 text-2xl font-extrabold text-[#18302e]">Attendance</h1><p className="mt-2 text-sm text-[#8993a7]">Attendance board and check-in records from the server.</p></div><label className="text-sm text-[#69758b]">Date<input type="date" value={date} onChange={(event) => { setLoading(true); setDate(event.target.value); }} className="ml-2 rounded-xl border border-[#dfe9e5] px-3 py-2.5" /></label></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b94b4b]">{error}</p>}
    {user?.role === "EMPLOYEE" && date === new Date().toISOString().slice(0, 10) && <section className="premium-card mb-5 flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-bold text-[#18302e]">Your attendance</h2><p className="mt-1 text-sm text-[#8993a7]">{own ? `Status: ${own.status.replaceAll("_", " ")}` : "No employee profile is linked to this account."}</p></div><div className="flex gap-2"><button onClick={() => void mark("check-in")} disabled={busy || Boolean(own?.checkIn)} className="rounded-xl bg-[#147d72] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Check in</button><button onClick={() => void mark("check-out")} disabled={busy || !own?.checkIn || Boolean(own?.checkOut)} className="rounded-xl border border-[#dfe9e5] px-4 py-3 text-sm font-bold text-[#536078] disabled:opacity-50">Check out</button></div></section>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{ label: "Employees", value: records.length, icon: Users }, { label: "Present", value: present, icon: CalendarCheck }, { label: "Absent", value: absent, icon: Clock3 }, { label: "On leave", value: leave, icon: CalendarCheck }].map(({ label, value, icon: Icon }) => <div key={label} className="premium-card p-5"><div className="flex items-center justify-between"><p className="text-sm text-[#8993a7]">{label}</p><Icon size={19} className="text-[#147d72]" /></div><p className="mt-4 text-3xl font-extrabold text-[#18302e]">{value}</p></div>)}</div>
    <section className="premium-card mt-6 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf0f6] p-5"><div><h2 className="font-bold text-[#18302e]">Daily attendance</h2><p className="mt-1 text-xs text-[#8993a7]">{date} · {records.length} records</p></div><div className="flex flex-wrap gap-3"><div className="flex items-center gap-2 rounded-xl border px-3 py-2.5"><Search size={16} className="text-[#929cb0]" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search attendance" placeholder="Search..." className="w-32 text-sm outline-none" /></div><select aria-label="Filter attendance status" value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="ALL">All statuses</option>{["PRESENT", "LATE", "HALF_DAY", "MISSING_CHECKOUT", "ABSENT", "ON_LEAVE", "OFF"].map((status) => <option key={status}>{status}</option>)}</select></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="bg-[#fafbfe] text-xs text-[#929cb0]"><tr><th className="px-5 py-4">EMPLOYEE</th><th className="px-5 py-4">DEPARTMENT</th><th className="px-5 py-4">CHECK-IN</th><th className="px-5 py-4">CHECK-OUT</th><th className="px-5 py-4">STATUS</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.employeeId} className="border-t border-[#f0f2f7]"><td className="px-5 py-4"><p className="text-sm font-semibold text-[#344057]">{record.name}</p><p className="mt-1 text-xs text-[#929cb0]">{record.code}</p></td><td className="px-5 py-4 text-sm text-[#69758b]">{record.department}</td><td className="px-5 py-4 text-sm text-[#69758b]">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : "—"}</td><td className="px-5 py-4 text-sm text-[#69758b]">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : "—"}</td><td className="px-5 py-4 text-sm">{record.status.replaceAll("_", " ")}</td></tr>)}</tbody></table>{loading && <p className="p-6 text-center text-sm text-[#8993a7]">Loading attendance…</p>}{!loading && !filtered.length && <p className="p-8 text-center text-sm text-[#8993a7]">No records match this date and filter.</p>}</div>
    </section>
    {user?.role === "EMPLOYEE" && <form onSubmit={requestCorrection} className="premium-card space-y-3 p-5"><h2 className="font-bold text-[#18302e]">Request an attendance correction</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input required type="date" value={correctionDate} onChange={(event) => setCorrectionDate(event.target.value)} className="rounded-xl border px-3 py-2.5 text-sm" /><input type="time" value={requestedIn} onChange={(event) => setRequestedIn(event.target.value)} aria-label="Requested check-in" className="rounded-xl border px-3 py-2.5 text-sm" /><input type="time" value={requestedOut} onChange={(event) => setRequestedOut(event.target.value)} aria-label="Requested check-out" className="rounded-xl border px-3 py-2.5 text-sm" /><input required value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Reason" className="rounded-xl border px-3 py-2.5 text-sm" /></div><button disabled={busy} className="rounded-xl bg-[#147d72] px-4 py-3 text-sm font-bold text-white">Submit correction request</button></form>}
    <section className="premium-card divide-y divide-[#edf0f6]"><div className="p-5"><h2 className="font-bold text-[#18302e]">Attendance correction requests</h2><p className="mt-1 text-xs text-[#8993a7]">Employee requests and HR decisions.</p></div>{corrections.map((request) => <article key={request.id} className="space-y-3 p-5"><div className="flex flex-wrap justify-between gap-2"><div><p className="text-sm font-semibold">{request.employee.fullName} · {request.employee.code}</p><p className="mt-1 text-sm text-[#69758b]">{request.date} · {request.reason}</p><p className="mt-1 text-xs text-[#8993a7]">Check-in: {request.requestedIn || "unchanged"} · Check-out: {request.requestedOut || "unchanged"}</p></div><span className="text-xs font-bold">{request.status}</span></div>{user?.role === "HR" && request.status === "PENDING" && <div className="flex flex-wrap gap-2"><input value={decisionComments[request.id] || ""} onChange={(event) => setDecisionComments({ ...decisionComments, [request.id]: event.target.value })} placeholder="Comment" className="min-w-40 flex-1 rounded-xl border px-3 py-2 text-sm" /><button disabled={busy} onClick={() => void decideCorrection(request.id, "APPROVED")} className="rounded-xl bg-[#16865f] px-3 py-2 text-sm font-semibold text-white">Approve</button><button disabled={busy} onClick={() => void decideCorrection(request.id, "REJECTED")} className="rounded-xl bg-[#b94b4b] px-3 py-2 text-sm font-semibold text-white">Reject</button></div>}{request.comment && <p className="text-sm text-[#8993a7]">HR comment: {request.comment}</p>}</article>)}{!corrections.length && <p className="p-6 text-sm text-[#8993a7]">No correction requests.</p>}</section>
  </AppShell>;
}
