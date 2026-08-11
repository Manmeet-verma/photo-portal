import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { clearConnection } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    await clearConnection(auth.uid);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to disconnect" }, { status: 500 });
  }
}
