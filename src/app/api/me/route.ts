import { NextRequest, NextResponse } from "next/server";
import { setupError, requireAuth, getUserDoc } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;
  try {
    const user = await getUserDoc(auth.uid);
    if (!user) {
      return NextResponse.json({ error: "Account not found — please sign in again." }, { status: 404 });
    }
    return NextResponse.json({
      user: { uid: auth.uid, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}