import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

// جلب الكوبونات
export async function GET() {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ success: true, coupons });
}

// إضافة كوبون
export async function POST(request: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

  try {
    const { code, discountPercent } = await request.json();
    if (!code?.trim() || !discountPercent || discountPercent < 1 || discountPercent > 90) {
      return NextResponse.json(
        { success: false, error: "أدخل كود صالح ونسبة خصم بين 1 و 90" },
        { status: 400 }
      );
    }
    const existing = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (existing) {
      return NextResponse.json({ success: false, error: "هذا الكود موجود بالفعل" }, { status: 400 });
    }
    const coupon = await db.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        discountPercent: parseInt(discountPercent),
      },
    });
    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    console.error("Admin coupon POST error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء إضافة الكوبون" }, { status: 500 });
  }
}
