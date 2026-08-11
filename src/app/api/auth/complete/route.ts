import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserDoc } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { createUserRecord } from "@/lib/data";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  try {
    const body = await req.json().catch(() => ({}));
    let user = await getUserDoc(auth.uid);

    if (!user) {
      const adminSnap = await getAdminDb().collection("users").limit(1).get();
      const isFirstUser = adminSnap.empty;
      await createUserRecord(auth.uid, auth.email, body.name || "New user", isFirstUser ? "admin" : "user");
      user = await getUserDoc(auth.uid);
    }

    if (!user) return NextResponse.json({ error: "Could not create account" }, { status: 500 });

    return NextResponse.json({
      ok: true,
      user: {
        uid: auth.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Setup failed" }, { status: 500 });
  }
}