"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, roleHome, type AuthUser } from "@/lib/client";

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

const publicPaths = ["/", "/login", "/signup", "/setup"];
const rolePanelPaths = ["/admin", "/hr", "/employee"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  async function refresh(): Promise<void> {
    const data = await api<{ user: AuthUser | null }>("/api/auth/me");
    setUser(data.user);
  }

  useEffect(() => {
    let active = true;
    api<{ user: AuthUser | null; setup?: { ready: boolean } }>("/api/auth/me")
      .then((data) => {
        if (!active) return;
        setUser(data.user);
        if (!data.setup?.ready && pathname !== "/setup" && pathname !== "/signup" && pathname !== "/login") {
          router.replace("/signup");
        } else if (data.setup?.ready && pathname === "/setup") {
          router.replace("/login");
        } else if (!data.user && !publicPaths.includes(pathname)) router.replace("/login");
        else if (data.user?.mustChangePassword && pathname !== "/change-password") {
          router.replace("/change-password");
        } else if (data.user && !data.user.mustChangePassword) {
          const home = roleHome[data.user.role];
          if (pathname === "/" || pathname === "/login" || pathname === "/signup" || pathname === "/dashboard" || (rolePanelPaths.includes(pathname) && pathname !== home)) {
            router.replace(home);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
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
