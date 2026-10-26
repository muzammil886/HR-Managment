"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, ArrowRight, Eye, EyeOff } from "lucide-react";
import { api, roleHome, type Role } from "@/lib/client";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [databaseConfigured, setDatabaseConfigured] = useState<boolean | null>(null);
  const [setupReady, setSetupReady] = useState<boolean | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>("ADMIN");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ ready: boolean; databaseConfigured?: boolean }>("/api/setup/status")
      .then((data) => {
        setDatabaseConfigured(data.databaseConfigured ?? true);
        setSetupReady(data.ready);
      })
      .catch(() => {});
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/setup", {
        method: "POST",
        body: JSON.stringify({
          companyName,
          adminName: name,
          adminEmail: email.trim().toLowerCase(),
          adminPhone: phone.trim(),
          adminPassword: password,
        }),
      });
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      router.replace(roleHome.ADMIN);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f6ff] px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#dfe0ff] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#e6e8ff] blur-3xl" />

      <div className="relative w-full max-w-[460px]">
        <Link href="/login" className="mb-8 flex items-center justify-center gap-3">
          <div className="rounded-2xl bg-[#147d72] p-3 text-white shadow-lg shadow-indigo-200">
            <BriefcaseBusiness size={24} />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-[#18302e]">
            HCM<span className="text-[#147d72]">Lite</span>
          </span>
        </Link>

        <div className="rounded-[28px] border border-white bg-white/95 p-7 shadow-[0_20px_80px_rgba(40,50,100,0.09)] sm:p-10">
          {setupReady === null ? (
            <p className="py-8 text-center text-sm text-[#8490a5]">Checking workspace setup…</p>
          ) : setupReady ? (
            <div>
              <p className="mb-3 inline-flex rounded-full bg-[#f0f0ff] px-3 py-1.5 text-xs font-bold text-[#147d72]">
                ACCOUNT ACCESS
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#18302e]">
                Choose your account type
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#8490a5]">
                This workspace is already set up. Choose a role to see who creates that HCM Lite account.
              </p>
              <label htmlFor="signup-role" className="mb-2 mt-6 block text-sm font-semibold text-[#344057]">
                Account role
              </label>
              <select id="signup-role" className="premium-input bg-white" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as Role)}>
                <option value="ADMIN">Admin</option>
                <option value="HR">HR</option>
                <option value="EMPLOYEE">Employee</option>
              </select>
              <p className="mt-4 rounded-xl bg-[#f5f8f7] px-4 py-3 text-sm leading-6 text-[#536078]">
                {selectedRole === "ADMIN"
                  ? "The Admin account is created during the first workspace setup. Sign in with the Admin credentials."
                  : selectedRole === "HR"
                    ? "An Admin creates HR accounts. Ask your company Admin to set up your login."
                    : "HR creates Employee accounts when registering employees. Ask your HR team for access."}
              </p>
              <p className="mt-3 text-xs leading-5 text-[#8490a5]">
                MongoDB username and password connect the database; sign in with the HCM Lite account created for you.
              </p>
              <Link href={`/login?role=${selectedRole}`} className="premium-button mt-6 w-full py-3.5">
                Continue to sign in <ArrowRight size={18} />
              </Link>
              <p className="mt-6 text-center text-sm text-[#8490a5]">
                <Link href="/login" className="font-bold text-[#147d72] hover:underline">Back to sign in</Link>
              </p>
            </div>
          ) : (
          <>
          <div className="mb-7">
            <p className="mb-3 inline-flex rounded-full bg-[#f0f0ff] px-3 py-1.5 text-xs font-bold text-[#147d72]">
              GET STARTED
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#18302e]">
              Create your workspace
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#8490a5]">
              First-run setup creates the company and its Admin account. HR and Employee accounts are issued by your team.
            </p>
          </div>

          {databaseConfigured === false && <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">MongoDB is not configured. Copy <code>.env.example</code> to <code>.env</code>, set <code>DATABASE_URL</code>, then restart the server.</p>}

          {error ? (
            <p className="mb-5 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="company" className="mb-2 block text-sm font-semibold text-[#344057]">
                Company name
              </label>
              <input
                id="company"
                name="company"
                required
                placeholder="Acme Inc."
                className="premium-input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-semibold text-[#344057]">
                Full name
              </label>
              <input
                id="name"
                name="name"
                required
                autoComplete="name"
                placeholder="Enter your full name"
                className="premium-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-[#344057]">
                Phone number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="e.g. +92 300 1234567"
                className="premium-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#344057]">
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                className="premium-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#344057]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="premium-input pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-[#929cb0]"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-[#344057]">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="premium-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="premium-button w-full py-3.5 disabled:opacity-60">
              {loading ? "Creating workspace..." : "Create account"} <ArrowRight size={18} />
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#8490a5]">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-[#147d72] hover:underline">
              Sign in
            </Link>
          </p>
          </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[#929cb0]">
          HCM Lite · People management made simpler
        </p>
      </div>
    </main>
  );
}
