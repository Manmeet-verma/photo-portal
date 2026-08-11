import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEvent } from "@/lib/auth";
import { addPhoto } from "@/lib/data";
import { getAdminStorage } from "@/lib/firebase-admin";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const { id } = await params;
    if (!(await getEvent(id))) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

    const form = await req.formData().catch(() => null);
    const files = form ? (form.getAll("photos") as File[]).filter((f) => f.size > 0) : [];
    if (!files.length) return NextResponse.json({ error: "No photos selected" }, { status: 400 });

    const bucket = getAdminStorage().bucket();
    const created: { id: string; name: string }[] = [];

    for (const file of files) {
      const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6) || "jpg";
      const path = `events/${id}/photos/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const blob = bucket.file(path);
      await blob.save(buffer, { contentType: file.type || "image/jpeg", metadata: { cacheControl: "public, max-age=86400" } });
      await blob.makePublic();
      const url = `https://storage.googleapis.com/${bucket.name}/${path}`;
      const photoId = await addPhoto(id, { name: file.name, url });
      created.push({ id: photoId, name: file.name });
    }

    return NextResponse.json({ ok: true, photos: created });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}
