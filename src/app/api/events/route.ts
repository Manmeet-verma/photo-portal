import { NextRequest, NextResponse } from "next/server";
import { requireAuth, listEventsForUser } from "@/lib/auth";
import { createEvent, updateEvent } from "@/lib/data";
import { isFirebaseConfigured } from "@/lib/config";

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

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;
  try {
    const body = await req.json();
    const { title, eventDate, date, description, guestEmails, clientName, clientEmail, customerUid } = body;
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    const event = await createEvent({
      adminUid: auth.uid,
      adminName: auth.name,
      title,
      eventDate: eventDate || date || null,
      description: description || "",
      guestEmails: Array.isArray(guestEmails) ? guestEmails : [],
      clientName: clientName || "",
      clientEmail: clientEmail || "",
      customerUid: customerUid || "",
    });
    return NextResponse.json({ event });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create event" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;
  try {
    const { eventId, ...fields } = await req.json();
    if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    const clean: Record<string, string> = {};
    for (const k of ["title", "description", "eventDate", "clientName", "clientEmail", "customerUid"]) {
      if (fields[k] !== undefined) clean[k] = String(fields[k]);
    }
    await updateEvent(eventId, clean);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update event" }, { status: 500 });
  }
}