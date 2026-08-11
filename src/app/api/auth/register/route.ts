import { NextRequest, NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/config";
import { getAdminAuth } from "@/lib/firebase-admin";
import { createUserRecord } from "@/lib/data";

export const dynamic = "force-dynamic";

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";

export async function POST(req: NextRequest) {
  if (!isFirebaseConfigured || !API_KEY) {
    return NextResponse.json({ error: "Firebase is not configured yet." }, { status: 503 });
  }
  try {
    const { name, email, password } = await req.json().catch(() => ({}));
    if (!name || !email || !password) return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
    if (String(password).length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

    const created = await getAdminAuth().createUser({ email: String(email), password: String(password), displayName: String(name) });
    await createUserRecord(created.uid, String(email), String(name), "user");

    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(email), password: String(password), returnSecureToken: true }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error("Account created, but sign-in failed — try signing in manually.");

    return NextResponse.json({
      token: d.idToken,
      user: { uid: created.uid, name: String(name), email: String(email), role: "user", createdAt: new Date().toISOString() },
    });
  } catch (e: any) {
    const msg = e?.message?.includes("already in use") ? "An account with this email already exists." : e?.message || "Registration failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
