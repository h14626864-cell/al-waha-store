import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

// تعديل كوبون (تفعيل/إلغاء)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

  try {
    const { id } = await params;
    const { active } = await request.json();
    const coupon = await db.coupon.update({ where: { id }, data: { active: !!active } });
    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    console.error("Admin coupon PATCH error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}

// حذف كوبون
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

  try {
    const { id } = await params;
    await db.coupon.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin coupon DELETE error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
