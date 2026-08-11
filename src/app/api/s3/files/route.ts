import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getConnection, listS3Files } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const conn = await getConnection(auth.uid);
    if (!conn) return NextResponse.json({ error: "Connect your S3 bucket first (S3 tab)." }, { status: 503 });
    const prefix = req.nextUrl.searchParams.get("prefix") || "";
    const token = req.nextUrl.searchParams.get("token") || "";
    const data = await listS3Files(conn, prefix, token);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to list S3 objects" }, { status: 500 });
  }
}
