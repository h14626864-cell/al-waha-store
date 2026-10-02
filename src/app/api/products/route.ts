import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category");
    const search = searchParams.get("search");
    const featured = searchParams.get("featured");
    const isNew = searchParams.get("new");
    const sort = searchParams.get("sort") || "default";
    const limit = searchParams.get("limit");

    const where: Record<string, unknown> = {};

    if (categorySlug && categorySlug !== "all") {
      const category = await db.category.findUnique({ where: { slug: categorySlug } });
      if (category) where.categoryId = category.id;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { brand: { contains: search } },
      ];
    }
    if (featured === "true") where.featured = true;
    if (isNew === "true") where.isNew = true;

    let orderBy: Record<string, string> = { createdAt: "desc" };
    if (sort === "price_asc") orderBy = { price: "asc" };
    if (sort === "price_desc") orderBy = { price: "desc" };
    if (sort === "rating") orderBy = { rating: "desc" };
    if (sort === "sold") orderBy = { soldCount: "desc" };

    const products = await db.product.findMany({
      where,
      include: { category: { select: { name: true, slug: true } } },
      orderBy,
      ...(limit ? { take: parseInt(limit) } : {}),
    });

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تحميل المنتجات" },
      { status: 500 }
    );
  }
}
