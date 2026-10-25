
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, BriefcaseBusiness, Building2, CalendarDays } from "lucide-react";
import AppShell from "@/app/components/layout/dashboard-shell";

const employees = [
  { id: "EMP001", name: "Ayesha Khan", role: "Product Designer", department: "Design", email: "ayesha@example.com", status: "Active", joined: "January 15, 2025" },
  { id: "EMP002", name: "Hamza Ali", role: "Frontend Developer", department: "Engineering", email: "hamza@example.com", status: "Active", joined: "March 10, 2025" },
  { id: "EMP003", name: "Sara Ahmed", role: "HR Specialist", department: "Human Resources", email: "sara@example.com", status: "On Leave", joined: "June 1, 2024" },
  { id: "EMP004", name: "Usman Raza", role: "Accountant", department: "Finance", email: "usman@example.com", status: "Active", joined: "August 20, 2024" },
  { id: "EMP005", name: "Mariam Noor", role: "Marketing Executive", department: "Marketing", email: "mariam@example.com", status: "Inactive", joined: "February 3, 2025" },
];

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = employees.find(e => e.id === id);

  if (!employee) notFound();

  const details = [
    { label: "Employee ID", value: employee.id, icon: BriefcaseBusiness },
    { label: "Email address", value: employee.email, icon: Mail },
    { label: "Department", value: employee.department, icon: Building2 },
    { label: "Joining date", value: employee.joined, icon: CalendarDays },
  ];

  return (
    <AppShell>
      <Link href="/employees" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#737f95] hover:text-[#5b5ce2]">
        <ArrowLeft size={17} /> Back to employees
      </Link>

      <section className="premium-card overflow-hidden">
        <div className="h-36 bg-gradient-to-r from-[#5556d9] via-[#7778ee] to-[#a5a5ff]" />

        <div className="px-5 pb-7 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white bg-[#eeefff] text-3xl font-extrabold text-[#5b5ce2]">
                {employee.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-extrabold text-[#172033]">{employee.name}</h1>
                <p className="mt-1 text-sm text-[#8993a7]">{employee.role}</p>
              </div>
            </div>
            <span className={`mb-1 rounded-full px-3 py-1.5 text-xs font-bold ${employee.status === "Active" ? "bg-[#e6f8f0] text-[#16865f]" : employee.status === "On Leave" ? "bg-[#fff3e2] text-[#c78325]" : "bg-[#f0f2f6] text-[#78839a]"}`}>
              {employee.status}
            </span>
          </div>

          <div className="mt-8 border-t border-[#edf0f6] pt-7">
            <h2 className="text-lg font-bold text-[#172033]">Employee information</h2>
            <p className="mt-1 text-sm text-[#8993a7]">Basic profile and employment details.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {details.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-[#edf0f6] bg-[#fafbfe] p-5">
                  <div className="flex items-center gap-2 text-sm text-[#8993a7]"><Icon size={17} />{label}</div>
                  <p className="mt-3 break-words text-sm font-bold text-[#344057]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
