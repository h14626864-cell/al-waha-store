import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";
import { notifyOrderStatus } from "@/lib/whatsapp";

const VALID_STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

// تحديث حالة الطلب
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

  try {
    const { id } = await params;
    const { status } = await request.json();
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: "حالة غير صالحة" }, { status: 400 });
    }

    const before = await db.order.findUnique({ where: { id }, include: { items: true } });
    if (!before) {
      return NextResponse.json({ success: false, error: "الطلب غير موجود" }, { status: 404 });
    }

    const order = await db.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });

    // إشعار واتساب للعميل لما الحالة تتغير فعلًا (مش بيوقف التحديث لو فشل)
    if (before.status !== status) {
      notifyOrderStatus(
        {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          phone: order.phone,
        },
        status
      ).catch((e) => console.error("whatsapp notify error:", e));
    }

    // عند الإلغاء: إرجاع الكميات للمخزون
    if (status === "CANCELLED") {
      for (const item of order.items) {
        if (item.productId) {
          await db.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              soldCount: { decrement: item.quantity },
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Admin order PATCH error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء تحديث الطلب" }, { status: 500 });
  }
}
