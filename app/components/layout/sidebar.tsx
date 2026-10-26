"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Wallet,
  Building2,
  Settings,
  BriefcaseBusiness,
  Palmtree,
  Shield,
  Megaphone,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/app/providers";
import type { Role } from "@/lib/client";
import { roleHome } from "@/lib/client";

const allNav = [
  { label: "Overview", href: "", icon: LayoutDashboard, roles: ["ADMIN", "HR", "EMPLOYEE"] },
  { label: "Organization", href: "/organization", icon: Building2, roles: ["ADMIN", "HR"] },
  { label: "Users", href: "/users", icon: Shield, roles: ["ADMIN"] },
  { label: "Employees", href: "/employees", icon: Users, roles: ["ADMIN", "HR"] },
  { label: "My profile", href: "/profile", icon: UserRound, roles: ["EMPLOYEE"] },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck, roles: ["ADMIN", "HR", "EMPLOYEE"] },
  { label: "Leave", href: "/leave", icon: Palmtree, roles: ["ADMIN", "HR", "EMPLOYEE"] },
  { label: "Payroll", href: "/payroll", icon: Wallet, roles: ["ADMIN", "HR", "EMPLOYEE"] },
  { label: "Announcements", href: "/announcements", icon: Megaphone, roles: ["ADMIN", "HR", "EMPLOYEE"] },
  { label: "Audit log", href: "/audit", icon: Settings, roles: ["ADMIN"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = (user?.role || "EMPLOYEE") as Role;
  const navigation = allNav.filter((item) => item.roles.includes(role));
  const home = roleHome[role];

  return (
    <aside className="flex min-h-screen w-[250px] shrink-0 flex-col border-r border-[#20464a] bg-[#12363a] px-5 py-7 text-white">
      <Link href={home} className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e9b979] text-[#12363a] shadow-lg shadow-black/15">
          <BriefcaseBusiness size={23} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">
            HCM<span className="text-[#a8ded1]">Lite</span>
          </h1>
          <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-[#b7d2ce]">{role} workspace</p>
        </div>
      </Link>
      <nav className="flex flex-col gap-1">
        {navigation.map(({ label, href: itemHref, icon: Icon }) => {
          const href = itemHref || home;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                active
                  ? "bg-[#147d72] text-white shadow-md shadow-black/10"
                  : "text-[#c1d7d4] hover:bg-[#1d4b4d] hover:text-white"
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
