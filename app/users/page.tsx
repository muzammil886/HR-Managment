"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/layout/dashboard-shell";
import { api } from "@/lib/client";

type Account = { id: string; name: string; email: string; role: string; active: boolean; mustChangePassword: boolean; createdAt: string };
type Credential = { email: string; temporaryPassword: string };

export default function UsersPage() {
  const [users, setUsers] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [credential, setCredential] = useState<Credential | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() { setUsers(await api<Account[]>("/api/users")); }
  useEffect(() => {
    let active = true;
    api<Account[]>("/api/users").then((rows) => { if (active) setUsers(rows); }).catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load users."); });
    return () => { active = false; };
  }, []);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { setCredential(await api<Credential>("/api/users", { method: "POST", body: JSON.stringify({ name, email }) })); setName(""); setEmail(""); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not create HR account."); }
    finally { setBusy(false); }
  }

  async function userAction(id: string, action: "active" | "reset", active?: boolean) {
    setBusy(true); setError("");
    try {
      const result = await api<Credential>(`/api/users/${id}/${action}`, { method: "POST", body: action === "active" ? JSON.stringify({ active }) : "{}" });
      if (action === "reset") setCredential(result);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update user."); }
    finally { setBusy(false); }
  }

  return <AppShell><main className="space-y-5"><header><p className="text-sm text-[#8993a7]">Administration / Access</p><h1 className="mt-2 text-2xl font-extrabold text-[#18302e]">User accounts</h1><p className="mt-2 text-sm text-[#8993a7]">Create HR logins, deactivate accounts, or issue temporary passwords.</p></header>
    {error && <p role="alert" className="rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b94b4b]">{error}</p>}{credential && <p className="rounded-xl bg-[#e6f8f0] px-4 py-3 text-sm text-[#16865f]">Temporary credentials for {credential.email}: <strong>{credential.temporaryPassword}</strong>. Share securely; the user must change it after sign-in.<button onClick={() => setCredential(null)} className="ml-3 underline">Dismiss</button></p>}
    <form onSubmit={create} className="premium-card flex flex-wrap gap-3 p-5"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="HR full name" className="min-w-48 flex-1 rounded-xl border px-3 py-2.5 text-sm" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="HR email" className="min-w-48 flex-1 rounded-xl border px-3 py-2.5 text-sm" /><button disabled={busy} className="rounded-xl bg-[#147d72] px-4 py-3 text-sm font-bold text-white">Create HR login</button></form>
    <section className="premium-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#fafbfe] text-xs text-[#929cb0]"><tr><th className="px-5 py-4">USER</th><th className="px-5 py-4">ROLE</th><th className="px-5 py-4">STATUS</th><th className="px-5 py-4">PASSWORD</th><th className="px-5 py-4">ACTIONS</th></tr></thead><tbody>{users.map((account) => <tr key={account.id} className="border-t border-[#f0f2f7]"><td className="px-5 py-4"><p className="text-sm font-semibold">{account.name}</p><p className="mt-1 text-xs text-[#929cb0]">{account.email}</p></td><td className="px-5 py-4 text-sm">{account.role}</td><td className="px-5 py-4 text-sm">{account.active ? "Active" : "Inactive"}</td><td className="px-5 py-4 text-sm">{account.mustChangePassword ? "Change required" : "Set"}</td><td className="px-5 py-4"><div className="flex gap-3"><button disabled={busy || account.role === "ADMIN"} onClick={() => void userAction(account.id, "active", !account.active)} className="text-sm font-semibold text-[#147d72] disabled:opacity-50">{account.active ? "Deactivate" : "Activate"}</button><button disabled={busy || account.role === "ADMIN"} onClick={() => void userAction(account.id, "reset")} className="text-sm font-semibold text-[#147d72] disabled:opacity-50">Reset password</button></div></td></tr>)}</tbody></table>{!users.length && <p className="p-8 text-center text-sm text-[#8993a7]">No user accounts found.</p>}</div></section>
  </main></AppShell>;
}
