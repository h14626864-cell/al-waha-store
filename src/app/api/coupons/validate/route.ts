import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    if (!code?.trim()) {
      return NextResponse.json({ success: false, error: "أدخل كود الخصم" }, { status: 400 });
    }
    const coupon = await db.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!coupon || !coupon.active) {
      return NextResponse.json(
        { success: false, error: "كود الخصم غير صالح أو منتهي الصلاحية" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      coupon: { code: coupon.code, discountPercent: coupon.discountPercent },
    });
  } catch (error) {
    console.error("Coupon validate error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
