"use client";

import { useState } from "react";
import { Wallet, Users, TrendingUp, Search } from "lucide-react";
import AppShell from "@/app/components/layout/dashboard-shell"


type PayrollRecord = {
  id: string;
  name: string;
  dept: string;
  salary: number;
  status: "Processed" | "Pending";
};

const payroll: PayrollRecord[] = [
  {
    id: "EMP001",
    name: "Ayesha Khan",
    dept: "Design",
    salary: 180000,
    status: "Processed",
  },
  {
    id: "EMP002",
    name: "Hamza Ali",
    dept: "Engineering",
    salary: 220000,
    status: "Processed",
  },
  {
    id: "EMP003",
    name: "Sara Ahmed",
    dept: "Human Resources",
    salary: 150000,
    status: "Pending",
  },
  {
    id: "EMP004",
    name: "Usman Raza",
    dept: "Finance",
    salary: 160000,
    status: "Processed",
  },
  {
    id: "EMP005",
    name: "Mariam Noor",
    dept: "Marketing",
    salary: 135000,
    status: "Pending",
  },
];

const money = (amount: number) =>
  `Rs ${amount.toLocaleString("en-PK")}`;

export default function PayrollPage() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("October 2026");

  const filtered = payroll.filter((employee) =>
    `${employee.name} ${employee.id} ${employee.dept}`
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  );

  const total = payroll.reduce(
    (sum, employee) => sum + employee.salary,
    0
  );

  const processed = payroll.filter(
    (employee) => employee.status === "Processed"
  ).length;

  const stats = [
    {
      title: "Total Sample Payroll",
      value: money(total),
      icon: Wallet,
      color: "bg-[#eeefff] text-[#5b5ce2]",
    },
    {
      title: "Employee Records",
      value: String(payroll.length),
      icon: Users,
      color: "bg-[#e7f4ff] text-[#3188d8]",
    },
    {
      title: "Processed Records",
      value: `${processed} / ${payroll.length}`,
      icon: TrendingUp,
      color: "bg-[#e6f8f0] text-[#15966a]",
    },
  ];

  return (
    <AppShell>
      <main className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[#8993a7]">
              Finance / Compensation
            </p>
            <h1 className="mt-2 text-2xl font-extrabold text-[#172033]">
              Payroll
            </h1>
            <p className="mt-2 text-sm text-[#8993a7]">
              Review employee salary and payroll records.
            </p>
          </div>

          <select
            aria-label="Payroll period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="rounded-xl border border-[#e8ecf4] bg-white px-4 py-3 text-sm font-semibold text-[#536078] outline-none focus:border-indigo-400"
          >
            <option>October 2026</option>
            <option>September 2026</option>
            <option>August 2026</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map(({ title, value, icon: Icon, color }) => (
            <div
              key={title}
              className="premium-card rounded-2xl p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[#8993a7]">{title}</p>
                <div className={`rounded-xl p-3 ${color}`}>
                  <Icon size={20} />
                </div>
              </div>

              <p className="mt-5 text-2xl font-extrabold text-[#172033]">
                {value}
              </p>

              <p className="mt-2 text-xs text-[#929cb0]">
                Period: {period}
              </p>
            </div>
          ))}
        </div>

        <section className="premium-card overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf0f6] p-5">
            <div>
              <h2 className="font-bold text-[#172033]">
                Salary Records
              </h2>
              <p className="mt-1 text-xs text-[#8993a7]">
                Sample salaries in Pakistani rupees
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-[#e8ecf4] bg-white px-3 py-2.5 focus-within:border-indigo-400">
              <Search size={17} className="text-[#929cb0]" />
              <input
                aria-label="Search payroll"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employees..."
                className="w-36 bg-transparent text-sm text-[#344057] outline-none placeholder:text-[#929cb0] sm:w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead className="bg-[#fafbfe] text-xs text-[#929cb0]">
                <tr>
                  <th className="px-5 py-4 font-semibold">EMPLOYEE</th>
                  <th className="px-5 py-4 font-semibold">DEPARTMENT</th>
                  <th className="px-5 py-4 font-semibold">
                    MONTHLY SALARY
                  </th>
                  <th className="px-5 py-4 font-semibold">STATUS</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-t border-[#f0f2f7] transition-colors hover:bg-[#fafbfe]"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#344057]">
                        {employee.name}
                      </p>
                      <p className="mt-1 text-xs text-[#929cb0]">
                        {employee.id}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#69758b]">
                      {employee.dept}
                    </td>

                    <td className="px-5 py-4 text-sm font-bold text-[#344057]">
                      {money(employee.salary)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          employee.status === "Processed"
                            ? "bg-[#e6f8f0] text-[#16865f]"
                            : "bg-[#fff3e2] text-[#c78325]"
                        }`}
                      >
                        {employee.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <p className="p-8 text-center text-sm text-[#8993a7]">
                No payroll records found.
              </p>
            )}
          </div>

          <div className="border-t border-[#edf0f6] px-5 py-4">
            <p className="text-xs text-[#929cb0]">
              Showing {filtered.length} of {payroll.length} sample records.
              This page currently uses demo data.
            </p>
          </div>
        </section>
      </main>
    </AppShell>
  );
}