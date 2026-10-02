import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

// جلب التصنيفات للوحة التحكم
export async function GET() {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ success: true, categories });
}

// إضافة تصنيف
export async function POST(request: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

  try {
    const { name, description, image, sortOrder } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "أدخل اسم التصنيف" }, { status: 400 });
    }
    const baseSlug =
      name
        .trim()
        .toLowerCase()
        .replace(/[^\w\u0600-\u06FF]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "cat";
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

    const category = await db.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        image: image?.trim() || null,
        sortOrder: parseInt(sortOrder) || 0,
      },
    });
    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Admin category POST error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء إضافة التصنيف" }, { status: 500 });
  }
}
