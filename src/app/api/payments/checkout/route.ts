import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getPaymobKeys,
  getAuthToken,
  createPaymobOrder,
  createPaymentKey,
  buildIframeUrl,
  splitName,
} from "@/lib/paymob";

// بدء عملية دفع بايموب للطلب — بوابة حقيقية 100%
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderNumber = String(body.orderNumber || "").trim();
    if (!orderNumber) {
      return NextResponse.json({ success: false, error: "رقم الطلب مطلوب" }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { orderNumber },
      include: { payments: true, items: true },
    });
    if (!order) {
      return NextResponse.json({ success: false, error: "الطلب غير موجود" }, { status: 404 });
    }
    if (order.payments.some((p) => p.status === "PAID")) {
      return NextResponse.json({ success: false, error: "هذا الطلب مدفوع بالفعل" }, { status: 400 });
    }
    if (order.status === "CANCELLED") {
      return NextResponse.json({ success: false, error: "لا يمكن دفع طلب ملغي" }, { status: 400 });
    }

    // قراءة مفاتيح بايموب من إعدادات المتجر (اللوحة التحكم)
    const keys = await getPaymobKeys();
    if (!keys) {
      return NextResponse.json(
        {
          success: false,
          error:
            "بوابة بايموب غير مفعّلة بعد — لازم الأدمن يضيف مفاتيح بايموب من لوحة التحكم (الإعدادات → بوابة الدفع)",
        },
        { status: 400 }
      );
    }

    const amountCents = Math.round(order.total * 100);

    // 1) auth token
    const authToken = await getAuthToken(keys.apiKey);

    // 2) إنشاء أوردر في بايموب
    const paymobOrderId = await createPaymobOrder({
      authToken,
      amountCents,
      merchantOrderId: `${order.orderNumber}-${Date.now()}`,
      items: order.items.map((i) => ({
        name: i.productName,
        amountCents: Math.round(i.price * 100),
        quantity: i.quantity,
      })),
    });

    // 3) payment key
    const { first, last } = splitName(order.customerName);
    const paymentKey = await createPaymentKey({
      authToken,
      amountCents,
      paymobOrderId,
      integrationId: keys.cardIntegrationId,
      billing: {
        firstName: first,
        lastName: last,
        email: order.email || `customer+${order.orderNumber}@alwaha-store.com`,
        phone: order.phone,
        street: order.address,
        city: order.city,
        state: order.city,
      },
    });

    // 4) حفظ سجل الدفع + رابط الـ iframe
    await db.payment.create({
      data: {
        orderId: order.id,
        provider: "PAYMOB",
        amount: order.total,
        status: "PENDING",
        reference: String(paymobOrderId),
        paymobOrderId: String(paymobOrderId),
      },
    });

    const redirectUrl = buildIframeUrl(keys.iframeId, paymentKey);
    return NextResponse.json({ success: true, mode: "paymob", redirectUrl });
  } catch (error) {
    console.error("Paymob checkout error:", error);
    const message =
      error instanceof Error ? error.message : "حدث خطأ أثناء الاتصال ببوابة بايموب";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
