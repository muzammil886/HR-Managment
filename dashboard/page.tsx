"use client";

import AppShell from "@/app/components/layout/dashboard-shell";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-blue-600">
            HUMAN RESOURCE MANAGEMENT
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="mt-2 text-gray-500">
            Welcome back! Here is your HR overview.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Total Employees", value: "120" },
            { title: "Departments", value: "8" },
            { title: "Present Today", value: "108" },
            { title: "Pending Payroll", value: "12" },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-gray-500">{item.title}</p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900">
                {item.value}
              </h2>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Welcome to HCM Lite
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Manage employees, attendance, departments and payroll from your
            dashboard.
          </p>
        </div>
      </div>
    </AppShell>
  );
}