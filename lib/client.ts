export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...init, credentials: "include", headers });
  const isJson = res.headers.get("content-type")?.includes("json");
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message = typeof data === "object" && data && "error" in data ? String((data as { error: string }).error) : res.statusText;
    throw new Error(message);
  }
  return data as T;
}

export type Role = "ADMIN" | "HR" | "EMPLOYEE";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId: string | null;
  mustChangePassword: boolean;
};
