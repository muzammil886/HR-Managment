"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "@/app/providers";
import { api } from "@/lib/client";

type Notification = { id: string; title: string; body: string; read: boolean; createdAt: string };
const titles: Record<string, string> = { "/dashboard": "Overview", "/admin": "Admin Panel", "/hr": "HR Panel", "/employee": "Employee Panel", "/employees": "Employees", "/attendance": "Attendance", "/payroll": "Payroll", "/departments": "Departments", "/organization": "Organization", "/users": "User accounts", "/leave": "Leave", "/announcements": "Announcements", "/audit": "Audit log", "/profile": "My profile" };

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    let active = true;
    api<Notification[]>("/api/notifications").then((items) => { if (active) setNotifications(items); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const title = pathname.startsWith("/employees/") && pathname !== "/employees" ? "Employee details" : titles[pathname] || "HCM Lite";
  const unread = notifications.filter((item) => !item.read).length;

  async function openNotification(item: Notification) {
    if (!item.read) {
      try { await api(`/api/notifications/${item.id}/read`, { method: "POST" }); setNotifications((items) => items.map((current) => current.id === item.id ? { ...current, read: true } : current)); }
      catch { /* The notification stays unread if the server update fails. */ }
    }
  }

  return <header className="sticky top-0 z-20 flex min-h-[84px] flex-wrap items-center justify-between gap-4 border-b border-[#dfe9e5] bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-8">
    <div><p className="text-xs font-medium text-[#929cb0]">Workspace / HCM Lite</p><h2 className="mt-1 text-xl font-bold tracking-tight text-[#18302e]">{title}</h2></div>
    <div className="flex items-center gap-3 sm:gap-5">
      <div className="relative"><button type="button" aria-label={`Notifications, ${unread} unread`} onClick={() => setOpen(!open)} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#e9edf5] text-[#69758b] transition hover:bg-[#f5f6ff]"><Bell size={19} />{unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f17c79] px-1 text-[9px] font-bold text-white">{unread}</span>}</button>{open && <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[#dfe9e5] bg-white p-3 shadow-xl"><div className="flex items-center justify-between px-2 py-1"><p className="font-bold text-[#273249]">Notifications</p><Link href="/announcements" onClick={() => setOpen(false)} className="text-xs font-semibold text-[#147d72]">Announcements</Link></div><div className="mt-2 max-h-80 overflow-y-auto">{notifications.map((item) => <button key={item.id} onClick={() => void openNotification(item)} className={`block w-full rounded-xl p-3 text-left hover:bg-[#f7f7ff] ${item.read ? "opacity-70" : "bg-[#f5f6ff]"}`}><p className="text-sm font-semibold text-[#344057]">{item.title}</p><p className="mt-1 text-xs text-[#69758b]">{item.body}</p><p className="mt-1 text-[10px] text-[#929cb0]">{new Date(item.createdAt).toLocaleString()}</p></button>)}{!notifications.length && <p className="p-4 text-center text-sm text-[#8993a7]">No notifications.</p>}</div></div>}</div>
      <div className="flex items-center gap-2 border-l border-[#e9edf5] pl-3 sm:pl-5"><Link href={user?.role === "EMPLOYEE" ? "/profile" : "/organization"} className="flex min-w-0 items-center gap-2"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e3f2ed] text-sm font-bold text-[#156d65]">{user?.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("") || "U"}</div><div className="hidden min-w-0 sm:block"><p className="truncate text-sm font-semibold text-[#273249]">{user?.name || "Account"}</p><p className="mt-0.5 text-xs text-[#929cb0]">{user?.role || ""}</p></div></Link><button type="button" aria-label="Sign out" title="Sign out" onClick={() => void logout().catch((err: unknown) => setLogoutError(err instanceof Error ? err.message : "Could not sign out."))} className="rounded-lg p-2 text-[#778198] hover:bg-[#f5f6ff]"><LogOut size={17} /></button></div>
    </div>{logoutError && <p role="alert" className="absolute right-4 top-full rounded bg-white p-2 text-xs text-red-600">{logoutError}</p>}
  </header>;
}
