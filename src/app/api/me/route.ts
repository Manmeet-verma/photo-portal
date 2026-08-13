import { NextRequest, NextResponse } from "next/server";
import { setupError, requireAuth, getUserDoc } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;
  try {
    let user = null;
    try {
      user = await getUserDoc(auth.uid);
    } catch {
      user = null;
    }
    if (!user) {
      return NextResponse.json({
        user: { uid: auth.uid, name: auth.name || auth.email.split("@")[0], email: auth.email, role: auth.role, createdAt: new Date().toISOString() },
      });
    }
    return NextResponse.json({
      user: { uid: auth.uid, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (e: any) {
    return NextResponse.json({
      user: { uid: auth.uid, name: auth.name || auth.email.split("@")[0], email: auth.email, role: auth.role, createdAt: new Date().toISOString() },
    });
  }
}