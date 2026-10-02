import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

// جلب كل المنتجات (مع فلاتر) للوحة التحكم
export async function GET(request: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const where = search
    ? { OR: [{ name: { contains: search } }, { brand: { contains: search } }] }
    : {};

  const products = await db.product.findMany({
    where,
    include: { category: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, products });
}

// تنظيف قائمة المقاسات: نص مفصول بفواصل أو مصفوفة → مصفوفة نظيفة
function parseSizes(input: unknown): string[] {
  const raw = Array.isArray(input) ? input : typeof input === "string" ? input.split(/[,،\n]/) : [];
  return [...new Set(raw.map((s) => String(s).trim()).filter((s) => s.length > 0 && s.length <= 30))].slice(0, 20);
}

// تنظيف قائمة الألوان: [{ name, hex }]
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

// إضافة منتج جديد
export async function POST(request: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, description, price, comparePrice, image, categoryId, stock, brand, featured, isNew } = body;

    if (!name?.trim() || !price || !image?.trim() || !categoryId) {
      return NextResponse.json(
        { success: false, error: "املأ جميع الحقول المطلوبة (الاسم، السعر، الصورة، التصنيف)" },
        { status: 400 }
      );
    }

    // عرض الفلاش: سعر العرض + مدته (أو null لإلغائه)
    const salePrice = body.salePrice ? parseFloat(body.salePrice) : null;
    const saleEndsAt = salePrice && body.saleEndsAt ? new Date(body.saleEndsAt) : null;

    // توليد slug فريد من الاسم + لاحقة عشوائية
    const baseSlug =
      name
        .trim()
        .toLowerCase()
        .replace(/[^\w\u0600-\u06FF]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "product";
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

    const product = await db.product.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || "منتج جديد من متجر الواحة",
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        image: image.trim(),
        categoryId,
        stock: parseInt(stock) || 0,
        brand: brand?.trim() || null,
        featured: !!featured,
        isNew: isNew !== undefined ? !!isNew : true,
        sizes: parseSizes(body.sizes),
        colors: parseColors(body.colors),
        salePrice: salePrice && salePrice > 0 ? salePrice : null,
        saleEndsAt: saleEndsAt && !isNaN(saleEndsAt.getTime()) ? saleEndsAt : null,
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Admin product POST error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء إضافة المنتج" }, { status: 500 });
  }
}
