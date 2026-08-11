/* LensLink seed — creates a demo admin + a demo customer account.
   Usage:  npm run seed
   Requires .env with Firebase Admin SDK credentials (see .env.example). */

import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const envFile = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
const envFile2 = join(dirname(fileURLToPath(import.meta.url)), "..", ".env");

function loadEnv() {
  for (const f of [envFile, envFile2]) {
    try {
      for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
      }
    } catch {}
  }
}

loadEnv();

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

/* fallback: drop the downloaded key file at ./service-account.json */
if ((!clientEmail || !privateKey) && !clientEmail && !privateKey) {
  try {
    const saPath = join(dirname(fileURLToPath(import.meta.url)), "..", "service-account.json");
    const sa = JSON.parse(readFileSync(saPath, "utf8"));
    if (sa.client_email && sa.private_key) {
      clientEmail = clientEmail || sa.client_email;
      privateKey = privateKey || sa.private_key;
      console.log("• using service-account.json");
    }
  } catch {}
}

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin credentials. Save the service-account key as service-account.json in the project root (or set FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local).");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const auth = getAuth();
const db = getFirestore();

async function upsertUser(email, name, role, password) {
  try {
    const user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { password });
    const ref = db.collection("users").doc(user.uid);
    const doc = await ref.get();
    if (!doc.exists) {
      await ref.set({ name, email, role, createdAt: Timestamp.now() });
    } else {
      await ref.update({ name, role });
    }
    console.log(`✔ existing account updated → ${email} (${role})`);
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      const user = await auth.createUser({ email, password, displayName: name });
      await db.collection("users").doc(user.uid).set({ name, email, role, createdAt: Timestamp.now() });
      console.log(`✔ created account → ${email} (${role})`);
    } else {
      throw e;
    }
  }
  return email;
}

async function seedDemoEvent(adminEmail) {
  const snap = await db.collection("events").limit(1).get();
  if (!snap.empty) {
    console.log("• sample event already exists — skipping");
    return;
  }
  const { randomBytes } = await import("node:crypto");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 10; i++) code += chars[randomBytes(1)[0] % chars.length];

  const ref = db.collection("events").doc();
  await ref.set({
    adminUid: "",
    adminName: "Demo Studio",
    title: "Sample Gallery — Sarah & Ryan's Wedding",
    description: "A seeded demo gallery. Log in as the demo admin and add your own photos to see the magic.",
    eventDate: null,
    code,
    guestEmails: [],
    customerUid: "",
    clientName: "",
    clientEmail: "",
    createdAt: Timestamp.now(),
  });
  console.log(`✔ created sample event → share link: /s/${code}`);
}

try {
  const adminEmail = await upsertUser("admin@lenslink.app", "Demo Studio Admin", "admin", "admin123");
  await upsertUser("client@lenslink.app", "Sample Client", "user", "client123");
  await seedDemoEvent(adminEmail);
  console.log("\nDone! Demo accounts:");
  console.log("  photog -> admin@lenslink.app / admin123");
  console.log("  client -> client@lenslink.app / client123");
  console.log("\nSign in at http://localhost:3000/login");
  process.exit(0);
} catch (e) {
  console.error("Seed failed:", e.message);
  process.exit(1);
}