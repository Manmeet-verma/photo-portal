import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getConnection } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  const conn = await getConnection(auth.uid).catch(() => null);
  return NextResponse.json({
    configured: Boolean(conn),
    bucket: conn?.bucket || "",
    region: conn?.region || "",
  });
}
