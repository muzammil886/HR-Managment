"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, Building2, CalendarDays, Mail, Phone, MapPin } from "lucide-react";
import AppShell from "@/app/components/layout/dashboard-shell";
import { useAuth } from "@/app/providers";
import { api } from "@/lib/client";

type Employee = {
  id: string; code: string; fullName: string; email: string; phone: string; address: string;
  status: string; joinDate: string; basicSalary: number | null;
  department: { name: string }; designation: { name: string };
};

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api<Employee>(`/api/employees/${encodeURIComponent(id)}`)
      .then((row) => { if (active) { setEmployee(row); setPhone(row.phone); setAddress(row.address); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load employee."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function saveContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const updated = await api<Employee>(`/api/employees/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ phone, address }) });
      setEmployee((current) => current ? { ...current, phone: updated.phone, address: updated.address } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update contact details.");
    } finally { setSaving(false); }
  }

  return <AppShell>
    <Link href="/employees" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#737f95] hover:text-[#147d72]"><ArrowLeft size={17} /> Back to employees</Link>
    {error && <p role="alert" className="mb-4 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b94b4b]">{error}</p>}
    {loading ? <p className="p-8 text-sm text-[#8993a7]">Loading employee…</p> : !employee ? <p className="p-8 text-sm text-[#8993a7]">Employee record is unavailable.</p> : <section className="premium-card overflow-hidden">
      <div className="h-36 bg-gradient-to-r from-[#5556d9] via-[#36a89a] to-[#a8ded1]" />
      <div className="px-5 pb-7 sm:px-8"><div className="-mt-12 flex flex-wrap items-end justify-between gap-4"><div className="flex flex-wrap items-end gap-4"><div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white bg-[#e8f5f0] text-3xl font-extrabold text-[#147d72]">{employee.fullName.split(" ").map((part) => part[0]).join("")}</div><div className="pb-1"><h1 className="text-2xl font-extrabold text-[#18302e]">{employee.fullName}</h1><p className="mt-1 text-sm text-[#8993a7]">{employee.designation.name} · {employee.code}</p></div></div><span className="mb-1 rounded-full bg-[#e6f8f0] px-3 py-1.5 text-xs font-bold text-[#16865f]">{employee.status}</span></div>
        <div className="mt-8 border-t border-[#edf0f6] pt-7"><h2 className="text-lg font-bold text-[#18302e]">Employee information</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            { label: "Email address", value: employee.email, icon: Mail },
            { label: "Department", value: employee.department.name, icon: Building2 },
            { label: "Joining date", value: new Date(employee.joinDate).toLocaleDateString(), icon: CalendarDays },
            ...(employee.basicSalary == null ? [] : [{ label: "Basic salary", value: `Rs ${employee.basicSalary.toLocaleString("en-PK")}`, icon: BriefcaseBusiness }]),
            { label: "Phone", value: employee.phone || "Not provided", icon: Phone },
            { label: "Address", value: employee.address || "Not provided", icon: MapPin },
          ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-[#edf0f6] bg-[#fafbfe] p-5"><div className="flex items-center gap-2 text-sm text-[#8993a7]"><Icon size={17} />{label}</div><p className="mt-3 break-words text-sm font-bold text-[#344057]">{value}</p></div>)}
        </div></div>
        {user?.role === "EMPLOYEE" && user.employeeId === employee.id && <form onSubmit={saveContact} className="mt-7 border-t border-[#edf0f6] pt-6"><h2 className="font-bold text-[#18302e]">Update your contact details</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" className="rounded-xl border px-3 py-2.5 text-sm" /><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Address" className="rounded-xl border px-3 py-2.5 text-sm" /></div><button disabled={saving} className="mt-4 rounded-xl bg-[#147d72] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save contact details"}</button></form>}
      </div>
    </section>}
  </AppShell>;
}
