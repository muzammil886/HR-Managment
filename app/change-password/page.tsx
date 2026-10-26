"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, roleHome, type AuthUser } from "@/lib/client";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const updated = await api<AuthUser>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current, next }),
      });
      if (updated) router.replace(roleHome[updated.role]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6ff] px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-[28px] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold text-[#18302e]">Change password</h1>
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <input
          type="password"
          required
          placeholder="Current password"
          className="premium-input"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="New password"
          className="premium-input"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <button type="submit" disabled={loading} className="premium-button w-full py-3 disabled:opacity-60">
          {loading ? "Saving..." : "Update password"}
        </button>
      </form>
    </main>
  );
}
