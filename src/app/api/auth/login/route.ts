import { NextRequest, NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/config";
import { getUserDoc } from "@/lib/auth";

export const dynamic = "force-dynamic";

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";

export async function POST(req: NextRequest) {
  if (!isFirebaseConfigured || !API_KEY) {
    return NextResponse.json({ error: "Firebase is not configured yet." }, { status: 503 });
  }
  try {
    const { email, password } = await req.json().catch(() => ({}));
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const text = await r.text();
    let d: any = {};
    try {
      d = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json(
        { error: "Sign-in service returned an invalid response — check the server's outbound network access and the NEXT_PUBLIC_FIREBASE_API_KEY value." },
        { status: 502 }
      );
    }
    if (!r.ok) {
      const msg =
        d.error?.message === "INVALID_LOGIN_CREDENTIALS" || d.error?.message === "INVALID_PASSWORD"
          ? "Incorrect email or password."
          : d.error?.message?.replace(/_/g, " ").toLowerCase() || "Sign-in failed";
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    let doc = null;
    try {
      doc = await getUserDoc(d.localId);
    } catch {
      doc = null;
    }
    return NextResponse.json({
      token: d.idToken,
      user: {
        uid: d.localId,
        name: doc?.name || d.displayName || email.split("@")[0],
        email,
        role: doc?.role || "user",
        createdAt: doc?.createdAt ? (doc.createdAt as { toDate?: () => Date }).toDate?.().toISOString() : new Date().toISOString(),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Sign-in failed" }, { status: 500 });
  }
}
