import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: Storage | null = null;

type ServiceAccount = { clientEmail?: string; privateKey?: string };

let _sa: ServiceAccount | null | undefined;

function loadServiceAccount(): ServiceAccount {
  if (_sa !== undefined) return _sa || { clientEmail: "", privateKey: "" };
  try {
    const p = join(process.cwd(), "service-account.json");
    if (existsSync(p)) {
      const j = JSON.parse(readFileSync(p, "utf8"));
      _sa = { clientEmail: j.client_email, privateKey: j.private_key };
    } else {
      _sa = null;
    }
  } catch {
    _sa = null;
  }
  return _sa || { clientEmail: "", privateKey: "" };
}

export function isFirebaseAdminConfigured(): boolean {
  const sa = loadServiceAccount();
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      (process.env.FIREBASE_CLIENT_EMAIL || sa.clientEmail) &&
      (process.env.FIREBASE_PRIVATE_KEY || sa.privateKey)
  );
}

function formatPrivateKey(key: string): string {
  let k = key.trim();
  if (k.startsWith('"') && k.endsWith('"')) k = k.slice(1, -1);
  k = k.replace(/\\r\\n/g, "\n").replace(/\\r/g, "\n").replace(/\\n/g, "\n");
  k = k.replace(/\s+/, " ");
  const lines = k.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 1 && !k.includes("BEGIN")) {
    const raw = lines[0];
    const parts = raw.split(/(?=-----)/);
    if (parts.length >= 2) k = parts.join("\n");
  }
  return k;
}

function init() {
  if (!isFirebaseAdminConfigured()) {
    throw new Error(
      "Firebase Admin is not configured. Generate a service-account key (Firebase Console → Project settings → Service accounts → Generate new private key) and save it as service-account.json in the project root."
    );
  }
  const sa = loadServiceAccount();
  if (!getApps().length) {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || sa.privateKey || "";
    const privateKey = formatPrivateKey(rawKey);
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || sa.clientEmail || "",
        privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }
  if (!_auth) _auth = getAuth();
  if (!_db) _db = getFirestore();
  if (!_storage) _storage = getStorage();
}

export function getAdminAuth(): Auth {
  init();
  return _auth!;
}

export function getAdminDb(): Firestore {
  init();
  return _db!;
}

export function getAdminStorage(): Storage {
  init();
  return _storage!;
}

export type FireUserDoc = {
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: Timestamp;
};

export type FirePhotoDoc = {
  name: string;
  url?: string;
  driveFileId?: string;
  driveName?: string;
  s3Key?: string;
  s3Uid?: string;
  createdAt: Timestamp;
};

export type FireEventDoc = {
  adminUid: string;
  adminName?: string;
  title: string;
  description: string;
  eventDate: string | null;
  code: string;
  guestEmails: string[];
  customerUid?: string;
  clientName?: string;
  clientEmail?: string;
  createdAt: Timestamp;
};

export { Timestamp };
