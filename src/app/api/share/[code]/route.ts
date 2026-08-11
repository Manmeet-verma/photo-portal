import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { isFirebaseConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!code || !/^[A-Za-z0-9]{6,16}$/.test(code)) {
    return NextResponse.json({ error: "Invalid gallery link." }, { status: 400 });
  }
  try {
    if (!isFirebaseConfigured) {
      return NextResponse.json({ error: "Gallery service is not configured yet." }, { status: 503 });
    }
    const db = getAdminDb();
    const snap = await db.collection("events").where("code", "==", code).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: "Gallery not found." }, { status: 404 });
    }
    const event = snap.docs[0];
    const data = event.data();
    const photosSnap = await db.collection("events").doc(event.id).collection("photos").orderBy("createdAt", "asc").get();
    const photos = photosSnap.docs.map((d) => {
      const p = d.data();
      return {
        id: d.id,
        name: p.name || "",
        src: p.url ? p.url : `/api/photo/${d.id}`,
      };
    }).filter((p) => p.src);

    return NextResponse.json({
      gallery: {
        id: event.id,
        title: data.title || "Untitled gallery",
        description: data.description || "",
        adminName: data.adminName || "Photographer",
        eventDate: data.eventDate || null,
        code,
      },
      photos,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load gallery" }, { status: 500 });
  }
}