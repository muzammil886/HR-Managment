"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BriefcaseBusiness, ArrowRight, Eye, EyeOff } from "lucide-react";
import { api, roleHome, type AuthUser, type Role } from "@/lib/client";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center text-sm text-[#8490a5]">Loading sign in…</main>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleOverride, setRoleOverride] = useState<Role | null>(null);
  const queryRole = searchParams.get("role");
  const role = roleOverride ?? (queryRole === "HR" || queryRole === "EMPLOYEE" ? queryRole : "ADMIN");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupReady, setSetupReady] = useState<boolean | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    api<{ ready: boolean; companyName: string | null }>("/api/setup/status")
      .then((data) => {
        setSetupReady(data.ready);
        setCompanyName(data.companyName);
      })
      .catch(() => {
        setSetupReady(false);
      });
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await api<AuthUser>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          role,
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      if (user.mustChangePassword) {
        router.replace("/change-password");
      } else {
        router.replace(roleHome[user.role]);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f6ff] px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#dfe0ff] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#e6e8ff] blur-3xl" />

      <div className="relative w-full max-w-[460px]">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="rounded-2xl bg-[#147d72] p-3 text-white shadow-lg shadow-indigo-200">
            <BriefcaseBusiness size={24} />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-[#18302e]">
            HCM<span className="text-[#147d72]">Lite</span>
          </span>
        </Link>

        <div className="rounded-[28px] border border-white bg-white/95 p-7 shadow-[0_20px_80px_rgba(40,50,100,0.09)] sm:p-10">
          <p className="mb-3 inline-flex rounded-full bg-[#f0f0ff] px-3 py-1.5 text-xs font-bold text-[#147d72]">
            WELCOME BACK
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#18302e]">
            Sign in to HCM Lite
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#8490a5]">
            {companyName
              ? `Access ${companyName} and manage your team.`
              : "Access your workspace and manage your team."}
          </p>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="role" className="mb-2 block text-sm font-semibold text-[#344057]">
                Sign in as
              </label>
              <select id="role" name="role" className="premium-input bg-white" value={role} onChange={(e) => setRoleOverride(e.target.value as Role)}>
                <option value="ADMIN">Admin</option>
                <option value="HR">HR</option>
                <option value="EMPLOYEE">Employee</option>
              </select>
            </div>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#344057]">
                Email address
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
              <div className="mb-2 flex items-center justify-between gap-2">
                <label htmlFor="password" className="text-sm font-semibold text-[#344057]">
                  Password
                </label>
                <span className="text-xs text-[#929cb0]">Secure sign in</span>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
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

            <p className="-mt-2 text-xs leading-5 text-[#8490a5]">
              Use your HCM Lite account email and password. MongoDB credentials only connect the database; they are not app login details.
            </p>

            <button type="submit" disabled={loading} className="premium-button w-full py-3.5 disabled:opacity-60">
              {loading ? "Signing in..." : "Sign in"} <ArrowRight size={18} />
            </button>
          </form>

          {setupReady === false ? (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#edf0f6]" />
                <span className="text-xs text-[#a0a8b8]">NEW TO HCM LITE?</span>
                <div className="h-px flex-1 bg-[#edf0f6]" />
              </div>

              <Link
                href="/signup"
                className="flex w-full items-center justify-center rounded-xl border border-[#e6e9f2] py-3 text-sm font-bold text-[#4b5470] transition hover:border-[#c6c7ff] hover:bg-[#f7f7ff]"
              >
                Create an account
              </Link>
            </>
          ) : (
            <div className="mt-7 text-center text-sm text-[#8490a5]">
              <p>Need an account? HR and Employee access is issued by your company.</p>
              <Link href="/signup" className="mt-2 inline-block font-bold text-[#147d72] hover:underline">
                View sign-up options
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[#929cb0]">
          HCM Lite · People management made simpler
        </p>
      </div>
    </main>
  );
}
