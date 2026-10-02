import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

export async function GET() {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  const admin = await db.adminUser.findUnique({
    where: { id: adminId },
    select: { id: true, name: true, email: true },
  });
  if (!admin) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  return NextResponse.json({ success: true, admin });
}
