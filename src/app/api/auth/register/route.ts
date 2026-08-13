import { NextRequest, NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/config";

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

    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(email), password: String(password), displayName: String(name), returnSecureToken: true }),
    });
    const text = await r.text();
    let d: any = {};
    try {
      d = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json({ error: "Sign-up service returned an invalid response — try again." }, { status: 502 });
    }
    if (!r.ok) {
      const msg =
        d.error?.message === "EMAIL_EXISTS"
          ? "An account with this email already exists."
          : d.error?.message?.replace(/_/g, " ").toLowerCase() || "Registration failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({
      token: d.idToken,
      user: { uid: d.localId, name: String(name), email: String(email), role: "user", createdAt: new Date().toISOString() },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Registration failed" }, { status: 500 });
  }
}
