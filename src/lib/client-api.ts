"use client";

const TOKEN_KEY = "ll_token";
const USER_KEY = "ll_user";

export type ApiUser = { uid: string; name: string; email: string; role: "admin" | "user"; createdAt: string };

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(token: string, user: ApiUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function currentUser(): ApiUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function req<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const r = await fetch(`/api${path}`, { method, headers, body: payload });
  let data: any = null;
  try {
    data = await r.json();
  } catch {}
  if (!r.ok) {
    if (r.status === 401 && !path.startsWith("/auth/")) {
      clearAuth();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    const err: Error & { status?: number } = new Error((data && data.error) || `Request failed (${r.status})`);
    err.status = r.status;
    throw err;
  }
  return data;
}

export const api = {
  get: <T = any>(p: string) => req<T>("GET", p),
  post: <T = any>(p: string, b?: unknown) => req<T>("POST", p, b),
  patch: <T = any>(p: string, b?: unknown) => req<T>("PATCH", p, b),
  del: <T = any>(p: string) => req<T>("DELETE", p),
};

export function photoSrc(p: { url?: string; driveFileId?: string }) {
  return p.driveFileId ? `/api/drive/media/${p.driveFileId}` : p.url || "";
}