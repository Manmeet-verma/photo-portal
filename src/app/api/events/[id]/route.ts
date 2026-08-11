import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEvent, toIso } from "@/lib/auth";
import { deleteEvent } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(_req);
  if (!auth.ok) return auth.res;
  try {
    const { id } = await params;
    const item = await getEvent(id);
    if (!item) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    return NextResponse.json({
      item: {
        ...item,
        photoCount: (item.photos as unknown[]).length,
        cover: (item.photos as { id: string }[])[0] ? `/api/photo/${(item.photos as { id: string }[])[0].id}` : "",
        createdAt: toIso((item as { createdAt?: unknown }).createdAt),
        eventDate: toIso((item as { eventDate?: unknown }).eventDate),
        photos: (item.photos as { id: string; name?: string; url?: string; driveFileId?: string; driveName?: string }[]).map((p) => ({
          id: p.id,
          name: p.name || "",
          url: p.url || "",
          driveFileId: p.driveFileId || "",
          driveName: p.driveName || "",
        })),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load gallery" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const { id } = await params;
    await deleteEvent(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete gallery" }, { status: 500 });
  }
}
