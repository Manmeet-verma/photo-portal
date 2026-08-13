import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserDoc } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const body = await req.json().catch(() => ({}));

    let user = null;
    try {
      user = await getUserDoc(auth.uid);
    } catch {
      user = null;
    }

    return NextResponse.json({
      ok: true,
      user: {
        uid: auth.uid,
        name: user?.name || body.name || auth.name || auth.email.split("@")[0],
        email: user?.email || auth.email,
        role: user?.role || auth.role,
        createdAt: user?.createdAt ? user.createdAt.toDate?.().toISOString() || new Date().toISOString() : new Date().toISOString(),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Setup failed" }, { status: 500 });
  }
}
