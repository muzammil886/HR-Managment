"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, ArrowRight, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/client";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ ready: boolean }>("/api/setup/status")
      .then((data) => {
        if (data.ready) router.replace("/login");
      })
      .catch(() => {});
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/setup", {
        method: "POST",
        body: JSON.stringify({
          companyName,
          adminName: name,
          adminEmail: email.trim().toLowerCase(),
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
      router.replace("/dashboard");
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
          <div className="rounded-2xl bg-[#5b5ce2] p-3 text-white shadow-lg shadow-indigo-200">
            <BriefcaseBusiness size={24} />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-[#172033]">
            HCM<span className="text-[#5b5ce2]">Lite</span>
          </span>
        </Link>

        <div className="rounded-[28px] border border-white bg-white/95 p-7 shadow-[0_20px_80px_rgba(40,50,100,0.09)] sm:p-10">
          <div className="mb-7">
            <p className="mb-3 inline-flex rounded-full bg-[#f0f0ff] px-3 py-1.5 text-xs font-bold text-[#5b5ce2]">
              GET STARTED
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#172033]">
              Create your workspace
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#8490a5]">
              First-run setup creates your company and admin account.
            </p>
          </div>

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

            <button type="submit" disabled={loading} className="premium-button w-full py-3.5 disabled:opacity-60">
              {loading ? "Creating workspace..." : "Create account"} <ArrowRight size={18} />
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#8490a5]">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-[#5b5ce2] hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[#929cb0]">
          HCM Lite · People management made simpler
        </p>
      </div>
    </main>
  );
}
