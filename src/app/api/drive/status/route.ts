import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { driveConfigured, getDriveToken } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  const configured = driveConfigured();
  const token = configured ? await getDriveToken().catch(() => null) : null;
  return NextResponse.json({
    configured,
    connected: Boolean(token?.access_token),
    email: token?.email || "",
  });
}
