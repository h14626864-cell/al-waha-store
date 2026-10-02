import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPaymobKeys, verifyPaymobHmac } from "@/lib/paymob";

// ============================================================
// Webhook بايموب — Transaction processed callback
// بايموب يبعت POST هنا بعد كل معاملة (server-to-server)
// التحقق إجباري بتوقيع HMAC-SHA512 قبل الوثوق بأي بيانات
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body?.type !== "TRANSACTION" || !body?.obj) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const txn = body.obj;
    const receivedHmac = new URL(request.url).searchParams.get("hmac") || "";
    const keys = await getPaymobKeys();

    if (!keys || !keys.hmacSecret) {
      console.error("Paymob webhook: HMAC secret غير مضبوط — تم تجاهل الطلب");
      return NextResponse.json({ success: false, error: "not configured" }, { status: 400 });
    }

    // التحقق من التوقيع — الأمان الأساسي
    if (!verifyPaymobHmac(txn, keys.hmacSecret, receivedHmac)) {
      console.error("Paymob webhook: HMAC mismatch — تجاهل معاملة غير موثوقة");
      return NextResponse.json({ success: false, error: "invalid hmac" }, { status: 401 });
    }

    const paymobOrderId = String(txn?.order?.id ?? "");
    const success = txn.success === true;
    const pending = txn.pending === true;
    const amountCents = Number(txn.amount_cents || 0);

    // إيجاد سجل الدفع برقم أوردر بايموب
    const payment = await db.payment.findFirst({
      where: { paymobOrderId },
      include: { order: true },
    });
    if (!payment) {
      console.warn(`Paymob webhook: لا يوجد دفع برقم أوردر بايموب ${paymobOrderId}`);
      return NextResponse.json({ success: true, ignored: true });
    }

    // التحقق من المبلغ — ضد التلاعب
    const expectedCents = Math.round(payment.amount * 100);
    if (success && amountCents !== expectedCents) {
      console.error(
        `Paymob webhook: عدم تطابق المبلغ! متوقع ${expectedCents} وصل ${amountCents}`
      );
      await db.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", paymobTxnId: String(txn.id ?? "") },
      });
      return NextResponse.json({ success: false, error: "amount mismatch" }, { status: 400 });
    }

    if (success) {
      // الدفع نجح → تحديث الدفع والطلب
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          paymobTxnId: String(txn.id ?? ""),
          cardLast4: String(txn?.source_data?.pan || "").slice(-4) || null,
          paymobSuccessData: JSON.stringify({
            id: txn.id,
            success: txn.success,
            source: txn?.source_data?.type,
            pan: txn?.source_data?.pan,
            created_at: txn.created_at,
          }).slice(0, 1000),
        },
      });

      if (payment.order.paymentMethod !== "COD") {
        await db.order.update({
          where: { id: payment.orderId },
          data: { status: payment.order.status === "PENDING" ? "CONFIRMED" : payment.order.status },
        });
      }
    } else if (!pending) {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", paymobTxnId: String(txn.id ?? "") },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Paymob webhook error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
