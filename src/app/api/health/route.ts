import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export async function GET() {
  let fileKey = false;
  try {
    const p = join(process.cwd(), "service-account.json");
    fileKey = existsSync(p) && !!(JSON.parse(readFileSync(p, "utf8") || "{}").client_email);
  } catch {}
  return NextResponse.json({
    clientConfigured: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    adminConfigured: Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) || fileKey,
  });
}
