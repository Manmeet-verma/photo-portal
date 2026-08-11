import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEvent } from "@/lib/auth";
import { addPhoto } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const { id } = await params;
    if (!(await getEvent(id))) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const files: { id?: string; name?: string; thumbnail?: string }[] = Array.isArray(body.files) ? body.files : [];
    if (!files.length) return NextResponse.json({ error: "No files selected" }, { status: 400 });

    const photoIds: string[] = [];
    for (const f of files) {
      if (!f.id) continue;
      photoIds.push(await addPhoto(id, { name: f.name || f.id, driveFileId: f.id, driveName: f.name || "" }));
    }
    return NextResponse.json({ ok: true, count: photoIds.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to import photos" }, { status: 500 });
  }
}
