"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, Package } from "lucide-react";
import { navigate } from "@/lib/shop-utils";

const MAX_ATTEMPTS = 30;

// استخراج رقم الطلب من معاملات الرابط (#/paymob/return?order=WH-xxx)
// merchant_order_id بنبنيه بصيغة WH-xxx-timestamp — نشيل الـ timestamp
function readOrderNumberFromHash(): string {
  const hash = window.location.hash;
  const qs = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(qs);
  const order = params.get("order") || params.get("merchant_order_id") || "";
  const parts = order.split("-");
  // WH-250908-1234-1700000000 → WH-250908-1234
  return parts.length > 3 ? parts.slice(0, 3).join("-") : order;
}

// ============================================================
// صفحة الرجوع من بوابة بايموب
// بايموب بيرجّع العميل هنا بعد الدفع (Transaction response callback)
// بتتأكد من حالة الدفع بالاستعلام عن الطلب — التأكيد النهائي بيجي
// من الـ Webhook بتوقيع HMAC، فبنعمل polling لحين ما يوصل
// ============================================================
export function PaymobReturnView() {
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const checking = !!orderNumber && !paid && !failed && attempts < MAX_ATTEMPTS;

  // قراءة رقم الطلب من الرابط (المكون بيتحمّل مرة واحدة لكل رابط)
  useEffect(() => {
    const t = setTimeout(() => setOrderNumber(readOrderNumberFromHash()), 0);
    return () => clearTimeout(t);
  }, []);

  const checkPayment = useCallback(async (num: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(num)}`);
      const data = await res.json();
      if (data.success) {
        const payment = data.order.payments?.[0];
        if (payment?.status === "PAID") {
          setPaid(true);
          return true;
        }
        if (payment?.status === "FAILED") {
          setFailed(true);
          return true;
        }
      }
    } catch {
      // نكمل المحاولة
    }
    return false;
  }, []);

  // polling كل 3 ثواني لحد 90 ثانية (لحد ما الـ webhook يوصل)
  useEffect(() => {
    if (!checking || !orderNumber) return;
    const t = setTimeout(async () => {
      const done = await checkPayment(orderNumber);
      if (!done) setAttempts((a) => a + 1);
    }, 3000);
    return () => clearTimeout(t);
  }, [checking, orderNumber, attempts, checkPayment]);

  // نجاح → تحويل لصفحة الطلب بعد ثانية
  useEffect(() => {
    if (paid && orderNumber) {
      const t = setTimeout(() => navigate(`/order/${orderNumber}`), 1800);
      return () => clearTimeout(t);
    }
  }, [paid, orderNumber]);

  if (orderNumber === null) {
    return <div className="py-24 text-center text-muted-foreground">جاري التحميل...</div>;
  }

  if (!orderNumber) {
    return (
      <div className="max-w-md mx-auto text-center py-20 border rounded-2xl bg-card">
        <XCircle className="size-12 text-destructive mx-auto" />
        <p className="font-bold text-lg mt-4">لم نتمكن من تحديد الطلب</p>
        <p className="text-sm text-muted-foreground mt-2">
          لو خصم المبلغ من بطاقتك، هيتأكد الدفع تلقائيًا وتقدر تتأكد بنفسك من صفحة تتبع الطلب
        </p>
        <button
          onClick={() => navigate("/track")}
          className="mt-6 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold"
        >
          تتبع طلبك
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto text-center py-16 border rounded-2xl bg-card px-6">
      {paid ? (
        <>
          <CheckCircle2 className="size-16 text-emerald-600 mx-auto" />
          <p className="font-bold text-2xl mt-4">تم الدفع بنجاح</p>
          <p className="text-sm text-muted-foreground mt-2">شكرًا لك — جاري تحويلك لصفحة الطلب...</p>
          <p className="price-num text-xs text-muted-foreground mt-1" dir="ltr">
            {orderNumber}
          </p>
        </>
      ) : failed ? (
        <>
          <XCircle className="size-14 text-destructive mx-auto" />
          <p className="font-bold text-xl mt-4">فشلت عملية الدفع</p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            لم تتم المعاملة — لو اتحخصم أي مبلغ هيترجع تلقائيًا خلال أيام العمل.
            تقدر تحاول الدفع من جديد.
          </p>
          <div className="flex gap-2 justify-center mt-6">
            <button
              onClick={() => navigate(`/pay/${orderNumber}`)}
              className="rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold"
            >
              إعادة المحاولة
            </button>
            <button
              onClick={() => navigate(`/order/${orderNumber}`)}
              className="rounded-xl border px-6 py-2.5 text-sm font-bold hover:bg-accent"
            >
              تفاصيل الطلب
            </button>
          </div>
        </>
      ) : checking ? (
        <>
          <Loader2 className="size-14 text-primary animate-spin mx-auto" />
          <p className="font-bold text-xl mt-4">جاري التأكد من عملية الدفع...</p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            لحظات ونرجع لك — متقفلش الصفحة.
            <br />
            لو قفلتها، طلبك محفوظ وممكن تتأكد من صفحة تتبع الطلب.
          </p>
          <p className="price-num text-xs text-muted-foreground mt-2" dir="ltr">
            {orderNumber}
          </p>
        </>
      ) : (
        <>
          <Clock className="size-14 text-amber-500 mx-auto" />
          <p className="font-bold text-xl mt-4">الدفع قيد التأكيد</p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            استلمنا طلبك وانتظار تأكيد بايموب النهائي — بيوصل تلقائيًا خلال دقائق.
            تقدر تتأكد من حالة الطلب في أي وقت برقمه.
          </p>
          <div className="flex gap-2 justify-center mt-6">
            <button
              onClick={() => navigate(`/track?order=${orderNumber}`)}
              className="rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold"
            >
              تتبع الطلب
            </button>
            <button
              onClick={() => navigate(`/order/${orderNumber}`)}
              className="rounded-xl border px-6 py-2.5 text-sm font-bold hover:bg-accent flex items-center gap-1.5"
            >
              <Package className="size-4" />
              تفاصيل الطلب
            </button>
          </div>
        </>
      )}
    </div>
  );
}
