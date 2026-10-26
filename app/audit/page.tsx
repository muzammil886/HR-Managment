"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/layout/dashboard-shell";
import { api } from "@/lib/client";

type AuditEntry = { id: string; actorName: string; action: string; entity: string; entityId: string; before: string; after: string; createdAt: string };

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api<AuditEntry[]>("/api/audit").then((rows) => { if (active) setEntries(rows); }).catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load the audit log."); });
    return () => { active = false; };
  }, []);
  return <AppShell><main className="space-y-5"><header><p className="text-sm text-[#8993a7]">Administration / Security</p><h1 className="mt-2 text-2xl font-extrabold text-[#18302e]">Audit log</h1><p className="mt-2 text-sm text-[#8993a7]">Read-only history of important company actions.</p></header>{error && <p role="alert" className="rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b94b4b]">{error}</p>}<section className="premium-card divide-y divide-[#edf0f6]">{entries.map((entry) => <article key={entry.id} className="p-5"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold text-[#344057]">{entry.actorName} · {entry.action} · {entry.entity}</p><time className="text-xs text-[#929cb0]">{new Date(entry.createdAt).toLocaleString()}</time></div><p className="mt-1 text-xs text-[#8993a7]">Record {entry.entityId}</p>{entry.before && <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-[#147d72]">Before</summary><pre className="mt-2 overflow-auto rounded-xl bg-[#fafbfe] p-3 text-xs">{entry.before}</pre></details>}{entry.after && <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-[#147d72]">After</summary><pre className="mt-2 overflow-auto rounded-xl bg-[#fafbfe] p-3 text-xs">{entry.after}</pre></details>}</article>)}{!entries.length && !error && <p className="p-8 text-center text-sm text-[#8993a7]">No audit events have been recorded yet.</p>}</section></main></AppShell>;
}
