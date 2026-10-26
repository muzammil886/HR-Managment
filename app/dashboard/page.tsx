"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { roleHome } from "@/lib/client";
import { useAuth } from "../providers";

export default function DashboardRedirectPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace(roleHome[user.role]);
  }, [user, router]);

  return <main className="flex min-h-screen items-center justify-center text-sm text-[#8490a5]">Opening your panel…</main>;
}
