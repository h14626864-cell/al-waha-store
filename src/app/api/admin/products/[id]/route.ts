import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

// تنظيف قائمة المقاسات (نفس منطق POST)
function parseSizes(input: unknown): string[] {
  const raw = Array.isArray(input) ? input : typeof input === "string" ? input.split(/[,،\n]/) : [];
  return [...new Set(raw.map((s) => String(s).trim()).filter((s) => s.length > 0 && s.length <= 30))].slice(0, 20);
}

// تنظيف قائمة الألوان [{ name, hex }]
function parseColors(input: unknown): { name: string; hex: string }[] | null {
  if (!Array.isArray(input)) return null;
  const clean = input
    .map((c) => {
      const obj = c as { name?: unknown; hex?: unknown };
      const name = String(obj?.name || "").trim().slice(0, 30);
      const hex = /^#[0-9a-fA-F]{3,8}$/.test(String(obj?.hex || "")) ? String(obj.hex) : "#000000";
      return { name, hex };
    })
    .filter((c) => c.name.length > 0)
    .slice(0, 20);
  return clean.length > 0 ? clean : null;
}

// تعديل منتج
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name.trim();
    if (body.description !== undefined) data.description = body.description.trim();
    if (body.price !== undefined) data.price = parseFloat(body.price);
    if (body.comparePrice !== undefined)
      data.comparePrice = body.comparePrice ? parseFloat(body.comparePrice) : null;
    if (body.image !== undefined) data.image = body.image.trim();
    if (body.categoryId !== undefined) data.categoryId = body.categoryId;
    if (body.stock !== undefined) data.stock = parseInt(body.stock) || 0;
    if (body.brand !== undefined) data.brand = body.brand?.trim() || null;
    if (body.featured !== undefined) data.featured = !!body.featured;
    if (body.isNew !== undefined) data.isNew = !!body.isNew;

    // المقاسات والألوان (خيارات المنتج)
    if (body.sizes !== undefined) data.sizes = parseSizes(body.sizes);
    if (body.colors !== undefined) data.colors = parseColors(body.colors);

    // عرض الفلاش: سعر مؤقت ينتهي بتاريخ — يرجع السعر تلقائيًا بعده
    if (body.salePrice !== undefined) {
      const salePrice = body.salePrice ? parseFloat(body.salePrice) : null;
      if (salePrice && salePrice > 0) {
        data.salePrice = salePrice;
        const end = body.saleEndsAt ? new Date(body.saleEndsAt) : null;
        data.saleEndsAt = end && !isNaN(end.getTime()) ? end : null;
      } else {
        // إلغاء العرض — رجّع السعر الأصلي فورًا
        data.salePrice = null;
        data.saleEndsAt = null;
      }
    } else if (body.saleEndsAt !== undefined && body.saleEndsAt) {
      const end = new Date(body.saleEndsAt);
      if (!isNaN(end.getTime())) data.saleEndsAt = end;
    }

    const product = await db.product.update({ where: { id }, data });
    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Admin product PATCH error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء تعديل المنتج" }, { status: 500 });
  }
}

// حذف منتج
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

  try {
    const { id } = await params;
    // فصل عناصر الطلب المرتبطة قبل الحذف (حفاظًا على سجل الطلبات)
    await db.orderItem.updateMany({ where: { productId: id }, data: { productId: null } });
    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin product DELETE error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء حذف المنتج" }, { status: 500 });
  }
}
