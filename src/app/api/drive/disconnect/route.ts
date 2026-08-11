import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { clearDriveToken } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    await clearDriveToken();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to disconnect" }, { status: 500 });
  }
}
