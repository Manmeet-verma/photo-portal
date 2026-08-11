import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { driveConfigured, listDriveFiles } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  if (!driveConfigured()) {
    return NextResponse.json({ error: "Google Drive is not configured on the server yet." }, { status: 503 });
  }
  try {
    const q = req.nextUrl.searchParams.get("q") || "";
    const pageToken = req.nextUrl.searchParams.get("pageToken") || "";
    const data = await listDriveFiles(q, pageToken);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to list Drive files" }, { status: 500 });
  }
}
