import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

// قائمة مشتركي النشرة البريدية للوحة التحكم (التصدير CSV بيتم في الواجهة)
export async function GET() {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  try {
    const subscribers = await db.subscriber.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });
    return NextResponse.json({ success: true, subscribers });
  } catch (error) {
    console.error("Admin subscribers GET error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
