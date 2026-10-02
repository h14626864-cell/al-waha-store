import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const product = await db.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) return NextResponse.json({ success: false, error: "المنتج غير موجود" }, { status: 404 });
    const reviews = await db.review.findMany({
      where: { productId: product.id, approved: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    console.error("Reviews GET error:", error);
    return NextResponse.json({ success: false, error: "تعذر تحميل التقييمات" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const name = String(body.name || "").trim().slice(0, 80);
    const comment = String(body.comment || "").trim().slice(0, 500);
    const rating = Number(body.rating);
    if (!name || !comment || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: "اكتب الاسم والتعليق واختر تقييمًا من 1 إلى 5" }, { status: 400 });
    }
    const product = await db.product.findUnique({ where: { slug }, select: { id: true, rating: true, reviewsCount: true } });
    if (!product) return NextResponse.json({ success: false, error: "المنتج غير موجود" }, { status: 404 });
    const result = await db.$transaction(async (tx) => {
      const created = await tx.review.create({ data: { productId: product.id, name, rating, comment } });
      const nextCount = product.reviewsCount + 1;
      const nextRating = ((product.rating * product.reviewsCount) + rating) / nextCount;
      const updatedProduct = await tx.product.update({ where: { id: product.id }, data: { reviewsCount: nextCount, rating: Math.round(nextRating * 10) / 10 }, select: { rating: true, reviewsCount: true } });
      return { review: created, product: updatedProduct };
    });
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    console.error("Reviews POST error:", error);
    return NextResponse.json({ success: false, error: "تعذر حفظ التقييم" }, { status: 500 });
  }
}
