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
  Camera,
} from "lucide-react";
import { useAuth } from "@/app/providers";
import type { Role } from "@/lib/client";

const allNav = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "HR", "EMPLOYEE"] },
  { label: "Organization", href: "/organization", icon: Building2, roles: ["ADMIN", "HR"] },
  { label: "Users", href: "/users", icon: Shield, roles: ["ADMIN"] },
  { label: "Employees", href: "/employees", icon: Users, roles: ["ADMIN", "HR"] },
  { label: "My profile", href: "/profile", icon: UserRound, roles: ["EMPLOYEE"] },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck, roles: ["ADMIN", "HR", "EMPLOYEE"] },
  { label: "Camera check-in", href: "/attendance/camera", icon: Camera, roles: ["HR", "EMPLOYEE"] },
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

  return (
    <aside className="flex min-h-screen w-[250px] shrink-0 flex-col border-r border-[#e8ecf4] bg-white px-5 py-7">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5b5ce2] text-white shadow-lg shadow-indigo-200">
          <BriefcaseBusiness size={23} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-[#172033]">
            HCM<span className="text-[#5b5ce2]">Lite</span>
          </h1>
          <p className="mt-0.5 text-xs text-[#8993a7]">{role} workspace</p>
        </div>
      </Link>
      <nav className="flex flex-col gap-1">
        {navigation.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                active
                  ? "bg-[#5b5ce2] text-white shadow-md shadow-indigo-200"
                  : "text-[#778198] hover:bg-[#f4f5ff] hover:text-[#5b5ce2]"
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
