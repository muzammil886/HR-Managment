"use client";

import {
  Users,
  Building2,
  CalendarCheck,
  Wallet,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import AppShell from "../components/layout/dashboard-shell";

const stats = [
  {
    title: "Total Employees",
    value: "120",
    note: "Active directory records",
    icon: Users,
    color: "bg-[#eeefff] text-[#5b5ce2]",
  },
  {
    title: "Departments",
    value: "8",
    note: "Across the workspace",
    icon: Building2,
    color: "bg-[#e7f4ff] text-[#3188d8]",
  },
  {
    title: "Present Today",
    value: "108",
    note: "90% attendance",
    icon: CalendarCheck,
    color: "bg-[#e6f8f0] text-[#15966a]",
  },
  {
    title: "Pending Payroll",
    value: "12",
    note: "Need review",
    icon: Wallet,
    color: "bg-[#fff1e5] text-[#e78b37]",
  },
];

const shortcuts = [
  {
    href: "/employees",
    title: "Employees",
    description: "View and manage employee records.",
  },
  {
    href: "/attendance",
    title: "Attendance",
    description: "Check who is present, absent, or on leave.",
  },
  {
    href: "/payroll",
    title: "Payroll",
    description: "Review salaries and pending payments.",
  },
  {
    href: "/departments",
    title: "Departments",
    description: "See teams, heads, and headcount.",
  },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-[#8993a7]">Workspace / Overview</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#172033]">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-[#8993a7]">
            Welcome back. Here is your HR overview.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ title, value, note, icon: Icon, color }) => (
            <div key={title} className="premium-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[#8993a7]">{title}</p>
                <div className={`rounded-xl p-3 ${color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="mt-5 text-3xl font-extrabold text-[#172033]">
                {value}
              </p>
              <p className="mt-2 text-xs text-[#929cb0]">{note}</p>
            </div>
          ))}
        </div>

        <section className="premium-card p-6">
          <h2 className="text-lg font-bold text-[#172033]">
            Welcome to HCM Lite
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8993a7]">
            Manage employees, attendance, departments, and payroll from one
            workspace.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {shortcuts.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-start justify-between gap-3 rounded-2xl border border-[#edf0f6] p-4 transition hover:border-[#c6c7ff] hover:bg-[#f7f7ff]"
              >
                <div>
                  <p className="font-semibold text-[#273249]">{item.title}</p>
                  <p className="mt-1 text-sm text-[#8993a7]">
                    {item.description}
                  </p>
                </div>
                <ArrowUpRight
                  size={18}
                  className="mt-1 shrink-0 text-[#5b5ce2]"
                />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
