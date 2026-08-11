import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEvent } from "@/lib/auth";
import { addPhoto } from "@/lib/data";
import { getConnection, s3HeadExists } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const conn = await getConnection(auth.uid);
    if (!conn) return NextResponse.json({ error: "Connect your S3 bucket first (S3 tab)." }, { status: 503 });
    const { id } = await params;
    if (!(await getEvent(id))) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const keys: string[] = Array.isArray(body.keys) ? body.keys.filter((k: unknown) => typeof k === "string" && k) : [];
    if (!keys.length) return NextResponse.json({ error: "No files selected" }, { status: 400 });

    const photoIds: string[] = [];
    for (const key of keys) {
      if (!(await s3HeadExists(conn, key))) continue;
      photoIds.push(await addPhoto(id, { name: key.split("/").pop() || key, s3Key: key, s3Uid: auth.uid }));
    }
    return NextResponse.json({ ok: true, count: photoIds.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to import photos" }, { status: 500 });
  }
}
