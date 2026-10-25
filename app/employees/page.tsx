
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserPlus, ArrowUpRight, Users } from "lucide-react";
import AppShell from "../components/layout/dashboard-shell";

const data = [
  { id: "EMP001", name: "Ayesha Khan", role: "Product Designer", department: "Design", email: "ayesha@example.com", status: "Active" },
  { id: "EMP002", name: "Hamza Ali", role: "Frontend Developer", department: "Engineering", email: "hamza@example.com", status: "Active" },
  { id: "EMP003", name: "Sara Ahmed", role: "HR Specialist", department: "Human Resources", email: "sara@example.com", status: "On Leave" },
  { id: "EMP004", name: "Usman Raza", role: "Accountant", department: "Finance", email: "usman@example.com", status: "Active" },
  { id: "EMP005", name: "Mariam Noor", role: "Marketing Executive", department: "Marketing", email: "mariam@example.com", status: "Inactive" },
];

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");

  const filtered = useMemo(() => data.filter((employee) => {
    const term = search.toLowerCase();
    return (
      `${employee.name} ${employee.email} ${employee.id} ${employee.role}`.toLowerCase().includes(term) &&
      (department === "All" || employee.department === department)
    );
  }), [search, department]);

  return (
    <AppShell>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[#8993a7]">People / Directory</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#172033]">Employees</h1>
          <p className="mt-2 text-sm text-[#8993a7]">Manage your team and employee records.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-[#eeefff] px-4 py-3 text-sm font-semibold text-[#5b5ce2]">
          <UserPlus size={18} /> Add employee
          <span className="text-xs">(coming soon)</span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total employees", value: data.length, icon: Users },
          { label: "Active employees", value: data.filter(e => e.status === "Active").length, icon: UserPlus },
          { label: "Departments", value: new Set(data.map(e => e.department)).size, icon: ArrowUpRight },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="premium-card flex items-center gap-4 p-5">
            <div className="rounded-xl bg-[#eeefff] p-3 text-[#5b5ce2]"><Icon size={21} /></div>
            <div><p className="text-sm text-[#8993a7]">{label}</p><p className="mt-1 text-2xl font-extrabold text-[#172033]">{value}</p></div>
          </div>
        ))}
      </div>

      <section className="premium-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf0f6] p-5">
          <div>
            <h2 className="font-bold text-[#172033]">Employee directory</h2>
            <p className="mt-1 text-xs text-[#8993a7]">{filtered.length} sample records</p>
          </div>
          <div className="flex w-full flex-wrap gap-3 sm:w-auto">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#e8ecf4] px-3 py-2.5 sm:w-56">
              <Search size={17} className="shrink-0 text-[#929cb0]" />
              <input aria-label="Search employees" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="w-full min-w-0 text-sm outline-none" />
            </div>
            <select aria-label="Filter by department" value={department} onChange={e => setDepartment(e.target.value)} className="rounded-xl border border-[#e8ecf4] bg-white px-3 py-2.5 text-sm text-[#536078] outline-none">
              <option>All</option>
              {[...new Set(data.map(e => e.department))].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-[#fafbfe] text-xs text-[#929cb0]">
              <tr>
                <th className="px-5 py-4 font-semibold">EMPLOYEE</th>
                <th className="px-5 py-4 font-semibold">ID</th>
                <th className="px-5 py-4 font-semibold">DEPARTMENT</th>
                <th className="px-5 py-4 font-semibold">STATUS</th>
                <th className="px-5 py-4 font-semibold">DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, index) => (
                <tr key={e.id} className="border-t border-[#f0f2f7] transition hover:bg-[#fafbff]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${["bg-pink-100 text-pink-700", "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700", "bg-teal-100 text-teal-700"][index % 5]}`}>
                        {e.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div><p className="text-sm font-semibold text-[#273249]">{e.name}</p><p className="mt-1 text-xs text-[#929cb0]">{e.email}</p></div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#69758b]">{e.id}</td>
                  <td className="px-5 py-4 text-sm text-[#69758b]">{e.department}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${e.status === "Active" ? "bg-[#e6f8f0] text-[#16865f]" : e.status === "On Leave" ? "bg-[#fff3e2] text-[#c78325]" : "bg-[#f0f2f6] text-[#78839a]"}`}>{e.status}</span></td>
                  <td className="px-5 py-4"><Link href={`/employees/${e.id}`} aria-label={`View ${e.name}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#5b5ce2] hover:underline">View <ArrowUpRight size={15} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-10 text-center text-sm text-[#8993a7]">No employees match your search.</p>}
        </div>
      </section>
    </AppShell>
  );
}
