/* Seeds demo photos onto the sample event (photos with local /assets/demo images). */

import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const envFile = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if ((!clientEmail || !privateKey) && !clientEmail && !privateKey) {
  try {
    const saPath = join(dirname(fileURLToPath(import.meta.url)), "..", "service-account.json");
    const sa = JSON.parse(readFileSync(saPath, "utf8"));
    if (sa.client_email && sa.private_key) {
      clientEmail = clientEmail || sa.client_email;
      privateKey = privateKey || sa.private_key;
      console.log("using service-account.json");
    }
  } catch {}
}

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin credentials — save service-account.json or set FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local");
  process.exit(1);
}
if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") }) });
}
const db = getFirestore();

const origin = process.env.APP_ORIGIN || "http://localhost:3000";
const shots = [
  ["wedding-1.jpg", "The first look"],
  ["wedding-2.jpg", "Ceremony — Sarah & Ryan"],
  ["portrait-1.jpg", "Golden hour portraits"],
  ["wedding-3.jpg", "First dance"],
  ["event-1.jpg", "Reception candids"],
  ["band-1.jpg", "Live music"],
];

const snap = await db.collection("events").limit(1).get();
if (snap.empty) {
  console.error("No events found — run `npm run seed` first.");
  process.exit(1);
}
const eventRef = snap.docs[0].ref;

/* share the sample gallery with the demo customer so their portal shows it */
const clientSnap = await db.collection("users").where("email", "==", "client@lenslink.app").limit(1).get();
if (!clientSnap.empty) {
  await eventRef.update({ customerUid: clientSnap.docs[0].id, clientName: "Sample Client", clientEmail: "client@lenslink.app" });
  console.log("shared sample gallery with client@lenslink.app");
}

const existing = await eventRef.collection("photos").get();
if (!existing.empty) {
  let mirrored = 0;
  for (const doc of existing.docs) {
    const d = doc.data();
    const top = await db.collection("photos").doc(doc.id).get();
    if (!top.exists) {
      await db.collection("photos").doc(doc.id).set({ eventId: eventRef.id, ...d });
      mirrored++;
    }
  }
  console.log(`Photo seeding skipped — ${existing.size} photo(s) already present (mirrored ${mirrored} to photos collection).`);
  process.exit(0);
}

for (const [file, name] of shots) {
  const photoRef = await eventRef.collection("photos").add({
    name,
    url: `${origin}/assets/demo/${file}`,
    createdAt: Timestamp.now(),
  });
  await db.collection("photos").doc(photoRef.id).set({
    eventId: eventRef.id,
    name,
    url: `${origin}/assets/demo/${file}`,
    createdAt: Timestamp.now(),
  });
  console.log(`added photo → ${file} (${name})`);
}
console.log("Done — refresh the gallery.");
process.exit(0);
