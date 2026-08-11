import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEvent } from "@/lib/auth";
import { deletePhoto } from "@/lib/data";
import { getAdminStorage } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; pid: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const { id, pid } = await params;
    const item = await getEvent(id);
    if (!item) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    const photo = (item.photos as { id: string; url?: string }[]).find((p) => p.id === pid);
    if (photo?.url) {
      try {
        const u = new URL(photo.url);
        const path = decodeURIComponent(u.pathname).replace(/^\//, "");
        await getAdminStorage().bucket().file(path).delete().catch(() => {});
      } catch {}
    }
    await deletePhoto(id, pid);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete photo" }, { status: 500 });
  }
}
