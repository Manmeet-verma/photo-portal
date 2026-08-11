import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { setUserRole, deleteUserRecord, setUserName } from "@/lib/data";
import { getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const { uid } = await params;
    const body = await req.json().catch(() => ({}));

    if (typeof body.name === "string" && body.name.trim()) {
      await setUserName(uid, body.name.trim());
      await getAdminAuth().updateUser(uid, { displayName: body.name.trim() }).catch(() => {});
    }
    if (["admin", "user"].includes(body.role)) {
      await setUserRole(uid, body.role);
    }
    if (typeof body.password === "string" && body.password.length >= 6) {
      await getAdminAuth().updateUser(uid, { password: body.password });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const { uid } = await params;
    if (uid === auth.uid) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    await getAdminAuth().deleteUser(uid).catch(() => {});
    await deleteUserRecord(uid);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete user" }, { status: 500 });
  }
}
