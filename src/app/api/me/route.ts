import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserDoc } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    let user = null;
    try {
      user = await getUserDoc(auth.uid);
    } catch {
      user = null;
    }

    return NextResponse.json({
      user: {
        uid: auth.uid,
        name: user?.name || auth.name || auth.email.split("@")[0],
        email: user?.email || auth.email,
        role: user?.role || auth.role,
        createdAt: user?.createdAt ? user.createdAt.toDate?.().toISOString() || new Date().toISOString() : new Date().toISOString(),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
