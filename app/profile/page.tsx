"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/layout/dashboard-shell";
import { useAuth } from "../providers";

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user?.employeeId) router.replace(`/employees/${encodeURIComponent(user.employeeId)}`);
  }, [user?.employeeId, router]);
  return <AppShell><p className="p-8 text-sm text-[#8993a7]">{user?.employeeId ? "Opening your profile…" : "Your account is not linked to an employee profile."}</p></AppShell>;
}
