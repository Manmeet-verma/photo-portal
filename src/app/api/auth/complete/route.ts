import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserDoc } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  try {
    const body = await req.json().catch(() => ({}));
    let user = await getUserDoc(auth.uid);

    if (!user) {
      return NextResponse.json({
        ok: true,
        user: {
          uid: auth.uid,
          name: body.name || auth.name || auth.email.split("@")[0],
          email: auth.email,
          role: auth.role,
          createdAt: new Date().toISOString(),
        },
      });
    }

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