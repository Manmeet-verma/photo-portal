import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listUsers, createUserRecord } from "@/lib/data";
import { getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const { name, email, password, role } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "email and password are required" }, { status: 400 });
    const created = await getAdminAuth().createUser({
      email,
      password,
      displayName: name || email.split("@")[0],
    });
    await createUserRecord(created.uid, email, name || email.split("@")[0], role === "admin" ? "admin" : "user");
    return NextResponse.json({ ok: true, uid: created.uid });
  } catch (e: any) {
    const msg = e?.message || "Failed to create user";
    return NextResponse.json({ error: msg.includes("email") ? "An account with this email already exists" : msg }, { status: 500 });
  }
}
