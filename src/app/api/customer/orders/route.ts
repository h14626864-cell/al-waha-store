import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCustomerId } from "@/lib/customer-auth";

// طلبات العميل المسجل — لمتابعة حالة طلباته
export async function GET() {
  try {
    const customerId = await getCustomerId();
    if (!customerId) {
      return NextResponse.json({ success: false, error: "غير مسجل الدخول" }, { status: 401 });
    }
    const orders = await db.order.findMany({
      where: { customerId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("Customer orders error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء تحميل الطلبات" }, { status: 500 });
  }
}
