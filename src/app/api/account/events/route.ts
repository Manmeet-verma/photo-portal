import { NextRequest, NextResponse } from "next/server";
import { requireAuth, listEventsForUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;
  try {
    const events = await listEventsForUser(auth.uid, auth.role);
    return NextResponse.json({ events });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load events" }, { status: 500 });
  }
}
