import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// جلب طلب برقمه (تتبع عام بدون تسجيل دخول)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const order = await db.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!order) {
      return NextResponse.json({ success: false, error: "الطلب غير موجود" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Order GET error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
