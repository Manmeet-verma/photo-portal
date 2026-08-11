import { randomBytes } from "crypto";
import { getAdminDb, Timestamp, type FireEventDoc, type FirePhotoDoc } from "@/lib/firebase-admin";

export async function createUserRecord(uid: string, email: string, name: string, role: "admin" | "user" = "user") {
  await getAdminDb().collection("users").doc(uid).set({
    name,
    email,
    role,
    createdAt: Timestamp.now(),
  });
}

export async function createEvent(payload: Partial<FireEventDoc> & { title: string }) {
  const ref = getAdminDb().collection("events").doc();
  const code = payload.code || (await uniqueEventCode());
  await ref.set({
    adminUid: payload.adminUid || "",
    adminName: payload.adminName || "",
    title: payload.title,
    description: payload.description || "",
    eventDate: payload.eventDate || null,
    code,
    guestEmails: Array.isArray(payload.guestEmails) ? [...new Set(payload.guestEmails.map((e) => e.toLowerCase()))] : [],
    customerUid: payload.customerUid || "",
    clientName: payload.clientName || "",
    clientEmail: payload.clientEmail || "",
    createdAt: Timestamp.now(),
  } satisfies FireEventDoc);
  return { id: ref.id, code };
}

export async function addPhoto(eventId: string, photo: Omit<FirePhotoDoc, "createdAt">) {
  const db = getAdminDb();
  const ref = db.collection("events").doc(eventId).collection("photos").doc();
  const data = { ...photo, createdAt: Timestamp.now() };
  await ref.set(data);
  await db.collection("photos").doc(ref.id).set({ ...data, eventId }).catch(() => {});
  return ref.id;
}

export async function deletePhoto(eventId: string, photoId: string) {
  const db = getAdminDb();
  await db.collection("events").doc(eventId).collection("photos").doc(photoId).delete();
  await db.collection("photos").doc(photoId).delete().catch(() => {});
}

export async function updateEvent(eventId: string, fields: Partial<FireEventDoc>) {
  await getAdminDb().collection("events").doc(eventId).update(fields);
}

export async function deleteEvent(eventId: string) {
  const db = getAdminDb();
  const photos = await db.collection("events").doc(eventId).collection("photos").get();
  await Promise.all(photos.docs.map((p) => p.ref.delete())).catch(() => {});
  await Promise.all(photos.docs.map((p) => db.collection("photos").doc(p.id).delete())).catch(() => {});
  await db.collection("events").doc(eventId).delete();
}

export async function setUserName(uid: string, name: string) {
  await getAdminDb().collection("users").doc(uid).update({ name });
  return getUserRecord(uid);
}

export async function setUserRole(uid: string, role: "admin" | "user") {
  await getAdminDb().collection("users").doc(uid).update({ role });
}

export async function listUsers() {
  const snap = await getAdminDb().collection("users").get();
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function getUserRecord(uid: string) {
  const snap = await getAdminDb().collection("users").doc(uid).get();
  return snap.exists ? { uid, ...snap.data() } : null;
}

export async function deleteUserRecord(uid: string) {
  await getAdminDb().collection("users").doc(uid).delete();
}

export async function setDriveToken(token: object) {
  await getAdminDb().collection("settings").doc("drive").set({ ...token, updatedAt: Timestamp.now() });
}

export async function getDriveToken(): Promise<(object & { access_token?: string; refresh_token?: string }) | null> {
  const snap = await getAdminDb().collection("settings").doc("drive").get();
  return snap.exists ? (snap.data() as object & { access_token?: string; refresh_token?: string }) : null;
}

export async function clearDriveToken() {
  await getAdminDb().collection("settings").doc("drive").delete().catch(() => {});
}

export function generateCode(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  const bytes = randomBytes(len);
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

export async function uniqueEventCode() {
  while (true) {
    const code = generateCode(10);
    const q = await getAdminDb().collection("events").where("code", "==", code).limit(1).get();
    if (q.empty) return code;
  }
}