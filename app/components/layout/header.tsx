
"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, ChevronDown } from "lucide-react";

const titles: Record<string, string> = {
  "/dashboard": "Overview",
  "/employees": "Employees",
  "/attendance": "Attendance",
  "/payroll": "Payroll Management",
  "/departments": "Departments",
};

export default function Header() {
  const pathname = usePathname();

  const title =
    pathname.startsWith("/employees/") && pathname !== "/employees"
      ? "Employee Details"
      : titles[pathname] || "Overview";

  return (
    <header className="sticky top-0 z-20 flex min-h-[84px] flex-wrap items-center justify-between gap-4 border-b border-[#e8ecf4] bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-8">
      <div>
        <p className="text-xs font-medium text-[#929cb0]">
          Workspace / HCM Lite
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[#172033]">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <div className="hidden items-center gap-2 rounded-xl border border-[#e9edf5] bg-[#f8f9fc] px-3 py-2.5 md:flex">
          <Search size={17} className="text-[#929cb0]" />
          <input
            aria-label="Search"
            placeholder="Search anything..."
            className="w-36 bg-transparent text-sm outline-none placeholder:text-[#a0a8b8] lg:w-48"
          />
          <kbd className="rounded border border-[#e0e5ee] bg-white px-1.5 py-0.5 text-[10px] text-[#929cb0]">
            /
          </kbd>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#e9edf5] text-[#69758b] transition hover:bg-[#f5f6ff]"
        >
          <Bell size={19} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#f17c79]" />
        </button>

        <div className="flex items-center gap-2 border-l border-[#e9edf5] pl-3 sm:pl-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9eaff] text-sm font-bold text-[#5354ce]">
            AD
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-[#273249]">
              Admin User
            </p>
            <p className="mt-0.5 text-xs text-[#929cb0]">Administrator</p>
          </div>
          <ChevronDown size={16} className="hidden text-[#929cb0] sm:block" />
        </div>
      </div>
    </header>
  );
}
