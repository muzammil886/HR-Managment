"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/layout/dashboard-shell";
import { useAuth } from "../providers";
import { api } from "@/lib/client";

type Announcement = { id: string; title: string; body: string; authorId: string; createdAt: string };

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api<Announcement[]>("/api/announcements").then((rows) => { if (active) setItems(rows); }).catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load announcements."); });
    return () => { active = false; };
  }, []);
  async function post(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { const item = await api<Announcement>("/api/announcements", { method: "POST", body: JSON.stringify({ title, body }) }); setItems((previous) => [item, ...previous]); setTitle(""); setBody(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not post announcement."); }
    finally { setBusy(false); }
  }
  return <AppShell><main className="space-y-5"><header><p className="text-sm text-[#8993a7]">Company / Updates</p><h1 className="mt-2 text-2xl font-extrabold text-[#18302e]">Announcements</h1><p className="mt-2 text-sm text-[#8993a7]">Company updates and notices.</p></header>{error && <p role="alert" className="rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b94b4b]">{error}</p>}{(user?.role === "ADMIN" || user?.role === "HR") && <form onSubmit={post} className="premium-card space-y-3 p-5"><h2 className="font-bold">Post announcement</h2><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" className="w-full rounded-xl border px-3 py-2.5 text-sm" /><textarea required value={body} onChange={(event) => setBody(event.target.value)} placeholder="Message" rows={4} className="w-full rounded-xl border px-3 py-2.5 text-sm" /><button disabled={busy} className="rounded-xl bg-[#147d72] px-4 py-3 text-sm font-bold text-white">{busy ? "Posting…" : "Post to company"}</button></form>}<section className="space-y-3">{items.map((item) => <article key={item.id} className="premium-card p-5"><p className="text-xs text-[#929cb0]">{new Date(item.createdAt).toLocaleString()}</p><h2 className="mt-2 font-bold text-[#18302e]">{item.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#69758b]">{item.body}</p></article>)}{!items.length && <div className="premium-card p-8 text-center text-sm text-[#8993a7]">No announcements yet.</div>}</section></main></AppShell>;
}
