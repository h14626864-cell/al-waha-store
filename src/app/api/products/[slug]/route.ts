import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const product = await db.product.findUnique({
      where: { slug },
      include: {
        category: { select: { name: true, slug: true } },
        reviews: { where: { approved: true }, orderBy: { createdAt: "desc" }, take: 50 },
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { type: "asc" } },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "المنتج غير موجود" },
        { status: 404 }
      );
    }

    // منتجات مشابهة من نفس التصنيف
    const related = await db.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id } },
      take: 4,
      include: { category: { select: { name: true, slug: true } } },
    });

    return NextResponse.json({ success: true, product, related });
  } catch (error) {
    console.error("Product GET error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تحميل المنتج" },
      { status: 500 }
    );
  }
}
