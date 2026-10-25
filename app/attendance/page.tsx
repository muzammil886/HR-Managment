
"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, Search, Users, Clock3 } from "lucide-react";
import AppShell from "../components/layout/dashboard-shell";

const records = [
  { id: "EMP001", name: "Ayesha Khan", dept: "Design", time: "09:02 AM", status: "Present" },
  { id: "EMP002", name: "Hamza Ali", dept: "Engineering", time: "09:15 AM", status: "Present" },
  { id: "EMP003", name: "Sara Ahmed", dept: "Human Resources", time: "—", status: "Leave" },
  { id: "EMP004", name: "Usman Raza", dept: "Finance", time: "—", status: "Absent" },
  { id: "EMP005", name: "Mariam Noor", dept: "Marketing", time: "08:55 AM", status: "Present" },
];

export default function AttendancePage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(() => records.filter(r =>
    `${r.name} ${r.id} ${r.dept}`.toLowerCase().includes(search.toLowerCase()) &&
    (filter === "All" || r.status === filter)
  ), [search, filter]);

  const counts = {
    Present: records.filter(r => r.status === "Present").length,
    Absent: records.filter(r => r.status === "Absent").length,
    Leave: records.filter(r => r.status === "Leave").length,
  };

  return (
    <AppShell>
      <div className="mb-7">
        <p className="text-sm text-[#8993a7]">Workforce / Daily records</p>
        <h1 className="mt-2 text-2xl font-extrabold text-[#172033]">Attendance</h1>
        <p className="mt-2 text-sm text-[#8993a7]">Review daily attendance and employee check-ins.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Total records", value: records.length, icon: Users, color: "bg-[#eeefff] text-[#5b5ce2]" },
          { title: "Present", value: counts.Present, icon: CalendarCheck, color: "bg-[#e6f8f0] text-[#15966a]" },
          { title: "Absent", value: counts.Absent, icon: Clock3, color: "bg-[#fff0ef] text-[#dc6666]" },
          { title: "On leave", value: counts.Leave, icon: CalendarCheck, color: "bg-[#fff3e2] text-[#c78325]" },
        ].map(({ title, value, icon: Icon, color }) => (
          <div key={title} className="premium-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#8993a7]">{title}</p>
              <div className={`rounded-xl p-2.5 ${color}`}><Icon size={19} /></div>
            </div>
            <p className="mt-4 text-3xl font-extrabold text-[#172033]">{value}</p>
          </div>
        ))}
      </div>

      <section className="premium-card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf0f6] p-5">
          <div>
            <h2 className="font-bold text-[#172033]">Daily attendance</h2>
            <p className="mt-1 text-xs text-[#8993a7]">Illustrative sample records</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-[#e8ecf4] px-3 py-2.5">
              <Search size={16} className="text-[#929cb0]" />
              <input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search attendance" placeholder="Search..." className="w-32 text-sm outline-none" />
            </div>
            <select aria-label="Filter attendance status" value={filter} onChange={e => setFilter(e.target.value)} className="rounded-xl border border-[#e8ecf4] bg-white px-3 py-2.5 text-sm outline-none">
              <option>All</option>
              <option>Present</option>
              <option>Absent</option>
              <option>Leave</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] text-left">
            <thead className="bg-[#fafbfe] text-xs text-[#929cb0]">
              <tr>
                <th className="px-5 py-4 font-semibold">EMPLOYEE</th>
                <th className="px-5 py-4 font-semibold">DEPARTMENT</th>
                <th className="px-5 py-4 font-semibold">CHECK-IN</th>
                <th className="px-5 py-4 font-semibold">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-[#f0f2f7]">
                  <td className="px-5 py-4"><p className="text-sm font-semibold text-[#344057]">{r.name}</p><p className="mt-1 text-xs text-[#929cb0]">{r.id}</p></td>
                  <td className="px-5 py-4 text-sm text-[#69758b]">{r.dept}</td>
                  <td className="px-5 py-4 text-sm text-[#69758b]">{r.time}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${r.status === "Present" ? "bg-[#e6f8f0] text-[#16865f]" : r.status === "Absent" ? "bg-[#fff0ef] text-[#c65d5d]" : "bg-[#fff3e2] text-[#c78325]"}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-8 text-center text-sm text-[#8993a7]">No attendance records found.</p>}
        </div>
      </section>
    </AppShell>
  );
}
