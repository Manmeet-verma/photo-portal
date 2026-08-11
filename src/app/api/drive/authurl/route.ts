import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { driveConfigured, driveAuthUrl } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  if (!driveConfigured()) {
    return NextResponse.json({ error: "Google OAuth credentials are not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)." }, { status: 503 });
  }
  return NextResponse.redirect(driveAuthUrl(auth.uid));
}
