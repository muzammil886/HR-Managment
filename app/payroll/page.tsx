"use client";

import { useEffect, useMemo, useState } from "react";
import { Wallet, Users, Search, RefreshCw, LockKeyhole } from "lucide-react";
import AppShell from "../components/layout/dashboard-shell";
import { useAuth } from "../providers";
import { api } from "@/lib/client";

type Payslip = {
  id: string;
  basic: number;
  gross: number;
  deductions: number;
  tax: number;
  net: number;
  employee: { fullName: string; code: string; department: { name: string } };
};
type PayrollRun = {
  id: string;
  year: number;
  month: number;
  status: string;
  payslips: Payslip[];
};
type PayrollResponse = { runs: PayrollRun[]; current: PayrollRun | null };

const money = (amount: number) => `Rs ${amount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

export default function PayrollPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PayrollResponse>({ runs: [], current: null });
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setData(await api<PayrollResponse>("/api/payroll"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payroll.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api<PayrollResponse>("/api/payroll")
      .then((result) => { if (active) setData(result); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load payroll."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function createDraft() {
    setBusy(true);
    setError("");
    try {
      await api("/api/payroll", { method: "POST", body: JSON.stringify({ year, month }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create payroll draft.");
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    if (!data.current) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/payroll/${data.current.id}/finalize`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finalize payroll.");
    } finally {
      setBusy(false);
    }
  }

  const current = data.current;
  const filtered = useMemo(() => current?.payslips.filter((slip) =>
    `${slip.employee.fullName} ${slip.employee.code} ${slip.employee.department.name}`.toLowerCase().includes(search.toLowerCase().trim()),
  ) ?? [], [current, search]);
  const netTotal = current?.payslips.reduce((sum, slip) => sum + slip.net, 0) ?? 0;

  return (
    <AppShell>
      <main className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[#8993a7]">Finance / Compensation</p>
            <h1 className="mt-2 text-2xl font-extrabold text-[#18302e]">Payroll</h1>
            <p className="mt-2 text-sm text-[#8993a7]">Payroll runs and payslips from your company records.</p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[#dfe9e5] bg-white px-4 py-3 text-sm font-semibold text-[#536078] disabled:opacity-50">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {error && <p role="alert" className="rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b94b4b]">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="premium-card p-5">
            <div className="flex items-center justify-between"><p className="text-sm text-[#8993a7]">Current run net pay</p><Wallet size={20} className="text-[#147d72]" /></div>
            <p className="mt-4 text-2xl font-extrabold text-[#18302e]">{money(netTotal)}</p>
            <p className="mt-2 text-xs text-[#929cb0]">{current ? `${current.month}/${current.year} · ${current.status}` : "No payroll run yet"}</p>
          </div>
          <div className="premium-card p-5">
            <div className="flex items-center justify-between"><p className="text-sm text-[#8993a7]">Payslips in current run</p><Users size={20} className="text-[#3188d8]" /></div>
            <p className="mt-4 text-2xl font-extrabold text-[#18302e]">{current?.payslips.length ?? 0}</p>
            <p className="mt-2 text-xs text-[#929cb0]">Loaded from MongoDB through the payroll API</p>
          </div>
        </div>

        {user?.role === "HR" && <section className="premium-card flex flex-wrap items-end gap-3 p-5">
          <label className="text-sm font-medium text-[#536078]">Year<input type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(Number(event.target.value))} className="mt-1 block w-28 rounded-xl border border-[#dfe9e5] px-3 py-2.5" /></label>
          <label className="text-sm font-medium text-[#536078]">Month<select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="mt-1 block rounded-xl border border-[#dfe9e5] bg-white px-3 py-2.5">{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2000, index).toLocaleString("en", { month: "long" })}</option>)}</select></label>
          <button onClick={() => void createDraft()} disabled={busy || loading} className="rounded-xl bg-[#147d72] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Working…" : "Create payroll draft"}</button>
        </section>}

        <section className="premium-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf0f6] p-5">
            <div><h2 className="font-bold text-[#18302e]">{current ? `Payroll · ${current.month}/${current.year}` : "Payroll records"}</h2><p className="mt-1 text-xs text-[#8993a7]">{current ? `Run status: ${current.status}` : "Create a payroll draft after registering employees."}</p></div>
            <div className="flex items-center gap-2 rounded-xl border border-[#dfe9e5] px-3 py-2.5"><Search size={16} className="text-[#929cb0]" /><input aria-label="Search payroll" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees..." className="w-40 text-sm outline-none" /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-[#fafbfe] text-xs text-[#929cb0]"><tr><th className="px-5 py-4">EMPLOYEE</th><th className="px-5 py-4">DEPARTMENT</th><th className="px-5 py-4">GROSS</th><th className="px-5 py-4">DEDUCTIONS + TAX</th><th className="px-5 py-4">NET</th></tr></thead>
              <tbody>{filtered.map((slip) => <tr key={slip.id} className="border-t border-[#f0f2f7]"><td className="px-5 py-4"><p className="text-sm font-semibold text-[#344057]">{slip.employee.fullName}</p><p className="mt-1 text-xs text-[#929cb0]">{slip.employee.code}</p></td><td className="px-5 py-4 text-sm text-[#69758b]">{slip.employee.department.name}</td><td className="px-5 py-4 text-sm font-semibold">{money(slip.gross)}</td><td className="px-5 py-4 text-sm text-[#69758b]">{money(slip.deductions + slip.tax)}</td><td className="px-5 py-4 text-sm font-bold">{money(slip.net)}</td></tr>)}</tbody>
            </table>
            {!loading && filtered.length === 0 && <p className="p-8 text-center text-sm text-[#8993a7]">{current ? "No payslips match this search." : "No payroll data yet."}</p>}
            {loading && <p className="p-8 text-center text-sm text-[#8993a7]">Loading payroll…</p>}
          </div>
          {user?.role === "ADMIN" && current?.status === "DRAFT" && <div className="flex justify-end border-t border-[#edf0f6] p-5"><button onClick={() => void finalize()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#16865f] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><LockKeyhole size={16} />Finalize and lock run</button></div>}
        </section>
      </main>
    </AppShell>
  );
}
