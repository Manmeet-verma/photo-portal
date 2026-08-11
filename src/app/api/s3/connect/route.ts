import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getConnection, saveConnection, testConnection } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const body = await req.json().catch(() => ({}));
    const accessKeyId = String(body.accessKeyId || "").trim();
    const secretAccessKey = String(body.secretAccessKey || "").trim();
    const region = String(body.region || "ap-south-1").trim();
    const bucket = String(body.bucket || "").trim();
    if (!accessKeyId || !secretAccessKey || !bucket) {
      return NextResponse.json({ error: "Access key, secret key and bucket name are required." }, { status: 400 });
    }

    const conn = { accessKeyId, secretAccessKey, region, bucket };
    const test = await testConnection(conn);
    if (!test.ok) return NextResponse.json({ error: test.error }, { status: 400 });

    await saveConnection(auth.uid, conn);
    return NextResponse.json({ ok: true, bucket, region, source: "account" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to connect S3" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  const conn = await getConnection(auth.uid).catch(() => null);
  return NextResponse.json({ configured: Boolean(conn), bucket: conn?.bucket || "", region: conn?.region || "" });
}
