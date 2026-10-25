
"use client";

import { useState } from "react";
import {
  Building2,
  Users,
  Search,
  ArrowUpRight,
  BriefcaseBusiness,
} from "lucide-react";
import AppShell from "../components/layout/dashboard-shell";

const departments = [
  { name: "Engineering", head: "Hamza Ali", employees: 68, color: "bg-[#eeefff] text-[#5b5ce2]", description: "Software development and technology." },
  { name: "Design", head: "Ayesha Khan", employees: 24, color: "bg-[#fceafa] text-[#bc4eaa]", description: "Product design and user experience." },
  { name: "Human Resources", head: "Sara Ahmed", employees: 18, color: "bg-[#e6f8f0] text-[#15966a]", description: "People operations and recruitment." },
  { name: "Finance", head: "Usman Raza", employees: 22, color: "bg-[#fff1e5] text-[#e78b37]", description: "Financial planning and accounting." },
  { name: "Marketing", head: "Mariam Noor", employees: 31, color: "bg-[#e7f4ff] text-[#3188d8]", description: "Brand strategy and marketing." },
  { name: "Operations", head: "Ali Hassan", employees: 42, color: "bg-[#fff0ef] text-[#dc6666]", description: "Business operations and delivery." },
];

export default function DepartmentsPage() {
  const [search, setSearch] = useState("");

  const filtered = departments.filter(d =>
    `${d.name} ${d.head}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[#8993a7]">Organization / Structure</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#172033]">
            Departments
          </h1>
          <p className="mt-2 text-sm text-[#8993a7]">
            Explore teams and understand your organizational structure.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl bg-[#eeefff] px-4 py-3 text-sm font-semibold text-[#5b5ce2]">
          <Building2 size={18} />
          Add department
          <span className="text-xs">(coming soon)</span>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="premium-card flex items-center gap-4 p-5">
          <div className="rounded-xl bg-[#eeefff] p-3 text-[#5b5ce2]">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-sm text-[#8993a7]">Listed departments</p>
            <p className="mt-1 text-2xl font-extrabold text-[#172033]">
              {departments.length}
            </p>
          </div>
        </div>

        <div className="premium-card flex items-center gap-4 p-5">
          <div className="rounded-xl bg-[#e6f8f0] p-3 text-[#15966a]">
            <Users size={22} />
          </div>
          <div>
            <p className="text-sm text-[#8993a7]">Employees across listed teams</p>
            <p className="mt-1 text-2xl font-extrabold text-[#172033]">
              {departments.reduce((sum, d) => sum + d.employees, 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#e8ecf4] bg-white px-4 py-3">
        <Search size={19} className="text-[#929cb0]" />
        <input
          aria-label="Search departments"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search departments or department heads..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-[#a0a8b8]"
        />
      </div>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map(dept => (
          <article
            key={dept.name}
            className="premium-card p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className={`rounded-2xl p-3 ${dept.color}`}>
                <Building2 size={23} />
              </div>
              <ArrowUpRight size={19} className="text-[#a3abc0]" />
            </div>

            <h2 className="mt-5 text-lg font-bold text-[#172033]">
              {dept.name}
            </h2>
            <p className="mt-2 min-h-10 text-sm leading-5 text-[#8993a7]">
              {dept.description}
            </p>

            <div className="mt-5 flex items-center gap-3 border-t border-[#edf0f6] pt-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f2f8] text-[#64718a]">
                <BriefcaseBusiness size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[#929cb0]">Department head</p>
                <p className="mt-1 truncate text-sm font-semibold text-[#344057]">
                  {dept.head}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold text-[#172033]">
                  {dept.employees}
                </p>
                <p className="text-xs text-[#929cb0]">Employees</p>
              </div>
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <div className="premium-card p-8 text-center text-sm text-[#8993a7] sm:col-span-2 xl:col-span-3">
            No departments found.
          </div>
        )}
      </section>
    </AppShell>
  );
}
