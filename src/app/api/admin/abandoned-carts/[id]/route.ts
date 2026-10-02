import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

// حذف سلة متروكة (أو تجاهلها)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  try {
    const { id } = await params;
    await db.abandonedCart.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin abandoned-cart DELETE error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء الحذف" }, { status: 500 });
  }
}
