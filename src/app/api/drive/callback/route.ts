import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, storeDriveToken } from "@/lib/drive";
import { getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "";
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/admin.html?tab=drive&drive=denied", req.nextUrl.origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/admin.html?tab=drive&drive=error", req.nextUrl.origin));
  }
  try {
    if (state) {
      await getAdminAuth().getUser(state).catch(() => {});
    }
    const token = await exchangeCode(code);
    await storeDriveToken(token);
    return NextResponse.redirect(new URL("/admin.html?tab=drive&drive=connected", req.nextUrl.origin));
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/admin.html?tab=drive&drive=error&msg=${encodeURIComponent(e?.message || "Failed to connect")}`, req.nextUrl.origin));
  }
}
