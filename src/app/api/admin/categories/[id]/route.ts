import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

// تعديل تصنيف
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

  try {
    const { id } = await params;
    const { name, description, image, sortOrder } = await request.json();
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (image !== undefined) data.image = image?.trim() || null;
    if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder) || 0;

    const category = await db.category.update({ where: { id }, data });
    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Admin category PATCH error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء تعديل التصنيف" }, { status: 500 });
  }
}

// حذف تصنيف
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

  try {
    const { id } = await params;
    const count = await db.product.count({ where: { categoryId: id } });
    if (count > 0) {
      return NextResponse.json(
        { success: false, error: `لا يمكن حذف التصنيف — يحتوي على ${count} منتج. انقل المنتجات أولًا.` },
        { status: 400 }
      );
    }
    await db.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin category DELETE error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء حذف التصنيف" }, { status: 500 });
  }
}
