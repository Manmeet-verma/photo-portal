import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, type FireUserDoc } from "@/lib/firebase-admin";
import { isFirebaseConfigured } from "@/lib/config";

export type ApiUser = { uid: string; name: string; email: string; role: "admin" | "user"; createdAt: Date };

export function setupError() {
  return NextResponse.json(
    {
      error: "Firebase is not configured yet. See README → 'Firebase setup' (add env vars, then run `npm run seed`).",
      setup: "firebase",
    },
    { status: 503 }
  );
}

export async function getUserDoc(uid: string): Promise<FireUserDoc | null> {
  const snap = await getAdminDb().collection("users").doc(uid).get();
  return snap.exists ? (snap.data() as FireUserDoc) : null;
}

function tokenFromReq(req: Request) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export async function userFromRequest(req: Request, requireAdmin = false) {
  try {
    const token = tokenFromReq(req) || (await cookieToken());
    if (!token) return { user: null, error: "Not signed in" };
    const decoded = await getAdminAuth().verifyIdToken(token);
    const doc = await getUserDoc(decoded.uid);
    if (!doc) return { user: null, error: "Account not found" };
    const user: ApiUser = { uid: decoded.uid, name: doc.name, email: doc.email, role: doc.role, createdAt: doc.createdAt.toDate() };
    if (requireAdmin && user.role !== "admin") return { user: null, error: "Photographer account required" };
    return { user, error: null };
  } catch (e: any) {
    if (e?.message?.includes("Firebase Admin is not configured")) {
      return { user: null, error: "Server-side Firebase Admin is not configured — add service-account.json (or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY) on the server and restart it." };
    }
    return { user: null, error: "Session expired, please sign in again" };
  }
}

async function cookieToken() {
  const cookieStore = await cookies();
  return cookieStore.get("ll_token")?.value || null;
}

export type ReqAuth =
  | { ok: true; uid: string; email: string; name: string; role: "admin" | "user" }
  | { ok: false; res: Response };

export async function requireAuth(req: Request): Promise<ReqAuth> {
  if (!isFirebaseConfigured) return { ok: false, res: setupError() };
  const { user, error } = await userFromRequest(req);
  if (!user) return { ok: false, res: NextResponse.json({ error }, { status: 401 }) };
  return { ok: true, uid: user.uid, email: user.email, name: user.name, role: user.role };
}

export async function requireAdmin(req: Request): Promise<ReqAuth> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;
  if (auth.role !== "admin") {
    return { ok: false, res: NextResponse.json({ error: "Photographer account required" }, { status: 403 }) };
  }
  return auth;
}

export async function listEventsForUser(uid: string, role: "admin" | "user"): Promise<any[]> {
  let q = getAdminDb().collection("events").orderBy("createdAt", "desc");
  if (role !== "admin") {
    q = getAdminDb().collection("events").where("customerUid", "==", uid);
  }
  const snap = await q.get();
  return Promise.all(
    snap.docs.map(async (d) => {
      const photosSnap = await d.ref.collection("photos").limit(4).get();
      let count = photosSnap.size;
      if (photosSnap.size >= 4) {
        try {
          const agg = await d.ref.collection("photos").count().get();
          count = agg.data().count;
        } catch {}
      }
      const first = photosSnap.docs[0];
      return {
        id: d.id,
        ...(d.data() as object),
        createdAt: toIso(d.data()?.createdAt),
        eventDate: toIso(d.data()?.eventDate),
        photoCount: count,
        cover: first ? `/api/photo/${first.id}` : "",
        photos: photosSnap.docs.map((p) => ({ id: p.id, url: p.data().url, driveFileId: p.data().driveFileId })),
      };
    })
  );
}

export async function getEvent(eventId: string) {
  const ref = getAdminDb().collection("events").doc(eventId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const photosSnap = await ref.collection("photos").orderBy("createdAt").get();
  return {
    id: snap.id,
    ...(snap.data() as object),
    createdAt: toIso(snap.data()?.createdAt),
    eventDate: toIso(snap.data()?.eventDate),
    photos: photosSnap.docs.map((d) => ({ id: d.id, ...d.data() } as object & { createdAt?: unknown })),
  };
}

export async function getEventByCode(code: string) {
  const q = await getAdminDb().collection("events").where("code", "==", code).limit(1).get();
  if (q.empty) return null;
  return getEvent(q.docs[0].id);
}

export function toIso(d: unknown): string | null {
  if (!d) return null;
  return (d as { toDate?: () => Date }).toDate ? (d as { toDate: () => Date }).toDate().toISOString() : String(d);
}