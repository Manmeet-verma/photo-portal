import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { driveConfigured, driveMediaBytes } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const snap = await getAdminDb().collection("photos").doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    const p = snap.data() as { url?: string; driveFileId?: string; driveName?: string; name?: string };

    if (p.url) {
      return NextResponse.redirect(p.url);
    }
    if (p.driveFileId) {
      if (!driveConfigured()) return NextResponse.json({ error: "Google Drive is not configured on the server yet." }, { status: 503 });
      const { bytes, contentType } = await driveMediaBytes(p.driveFileId);
      return new NextResponse(new Uint8Array(bytes), {
        headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" },
      });
    }
    return NextResponse.json({ error: "Photo has no source" }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load photo" }, { status: 500 });
  }
}
