import { NextRequest, NextResponse } from "next/server";
import { driveConfigured, driveMediaBytes } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!driveConfigured()) {
    return NextResponse.json({ error: "Google Drive is not configured on the server yet." }, { status: 503 });
  }
  try {
    const { bytes, contentType } = await driveMediaBytes(id);
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load media" }, { status: 500 });
  }
}
