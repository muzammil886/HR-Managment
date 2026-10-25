"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, AuthUser } from "@/lib/client";

type Ctx = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

const publicPaths = ["/login", "/signup", "/setup"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  async function refresh() {
    const data = await api<{ user: AuthUser | null; setup?: { ready: boolean } }>("/api/auth/me");
    setUser(data.user);
    return data;
  }

  useEffect(() => {
    refresh()
      .then((data) => {
        if (!data.setup?.ready && pathname !== "/setup" && pathname !== "/signup") {
          router.replace("/signup");
        } else if (data.setup?.ready && (pathname === "/setup" || pathname === "/signup")) {
          router.replace("/login");
        } else if (!data.user && !publicPaths.includes(pathname)) router.replace("/login");
        else if (data.user?.mustChangePassword && pathname !== "/change-password") {
          router.replace("/change-password");
        } else if (data.user && (pathname === "/login" || pathname === "/signup")) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pathname, router]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.replace("/login");
  }

  return (
    <AuthCtx.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
