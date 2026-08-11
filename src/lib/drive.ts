import { getAdminDb } from "@/lib/firebase-admin";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_ORIGIN } from "@/lib/config";

const SCOPES = "https://www.googleapis.com/auth/drive.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const REDIRECT_URI = `${APP_ORIGIN}/api/drive/callback`;

export function driveConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

export function driveAuthUrl(uid: string): string {
  const p = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: uid,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

export type DriveToken = { access_token: string; refresh_token?: string; email?: string };

export async function getDriveToken(): Promise<DriveToken | null> {
  const snap = await getAdminDb().collection("settings").doc("drive").get();
  return snap.exists ? (snap.data() as DriveToken) : null;
}

export async function storeDriveToken(token: DriveToken) {
  await getAdminDb().collection("settings").doc("drive").set({ ...token, updatedAt: Date.now() });
}

export async function clearDriveToken() {
  await getAdminDb().collection("settings").doc("drive").delete().catch(() => {});
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const r = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) throw new Error("Drive session expired — reconnect Google Drive.");
  const d = await r.json();
  const next = await getDriveToken();
  await storeDriveToken({ ...(next || {}), access_token: d.access_token, refresh_token: next?.refresh_token || refreshToken });
  return d.access_token;
}

async function withAccess(): Promise<string> {
  const tok = await getDriveToken();
  if (!tok?.access_token) throw new Error("Google Drive is not connected.");
  return tok.access_token;
}

export async function refreshIfNeeded(get: () => Promise<Response>): Promise<Response> {
  const first = await get();
  if (first.status !== 401) return first;
  const tok = await getDriveToken();
  if (!tok?.refresh_token) return first;
  await refreshAccessToken(tok.refresh_token);
  return get();
}

export async function exchangeCode(code: string): Promise<DriveToken> {
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const r = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) throw new Error("Google rejected the authorization code.");
  const d = await r.json();
  let email = "";
  try {
    const u = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${d.access_token}` },
    });
    const info = await u.json();
    email = info.email || "";
  } catch {}
  return { access_token: d.access_token, refresh_token: d.refresh_token, email };
}

export type DriveFile = { id: string; name: string; thumbnail: string };

export async function listDriveFiles(query: string, pageToken: string): Promise<{ files: DriveFile[]; nextPageToken: string }> {
  const q = `mimeType contains 'image/' and trashed = false${query ? ` and name contains '${query.replace(/'/g, "\\'")}'` : ""}`;
  const sp = new URLSearchParams({ q, pageSize: "100", fields: "nextPageToken, files(id, name, mimeType, thumbnailLink)" });
  if (pageToken) sp.set("pageToken", pageToken);
  const url = `${DRIVE_API}/files?${sp.toString()}`;
  const res = await refreshIfNeeded(async () => fetch(url, { headers: { Authorization: `Bearer ${await withAccess()}` } }));
  if (!res.ok) throw new Error(`Drive error (${res.status})`);
  const d = await res.json();
  return {
    files: (d.files || []).map((f: { id: string; name: string; thumbnailLink?: string }) => ({
      id: f.id,
      name: f.name,
      thumbnail: f.thumbnailLink || `/api/drive/media/${f.id}`,
    })),
    nextPageToken: d.nextPageToken || "",
  };
}

export async function driveMediaBytes(fileId: string): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const url = `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`;
  const res = await refreshIfNeeded(async () => fetch(url, { headers: { Authorization: `Bearer ${await withAccess()}` } }));
  if (!res.ok) throw new Error(`Failed to load photo (${res.status})`);
  return { bytes: await res.arrayBuffer(), contentType: res.headers.get("content-type") || "image/jpeg" };
}
