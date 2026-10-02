"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatEGP, navigate } from "@/lib/shop-utils";
import { PAYMENT_METHODS, type Order } from "@/lib/types";
import { toast } from "sonner";

// صفحة "ادفع الآن" — بدء عملية دفع بايموب الحقيقية للطلبات غير المدفوعة
export function PaymentView({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [starting, setStarting] = useState(false);

  const loadOrder = () => {
    fetch(`/api/orders/${encodeURIComponent(orderNumber)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrder(d.order);
      })
      .finally(() => setLoadingOrder(false));
  };

  useEffect(loadOrder, [orderNumber]);

  // بدء الدفع عبر بايموب
  const startPaymob = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });
      const data = await res.json();
      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl; // صفحة بايموب الآمنة
        return;
      }
      toast.error(data.error || "فشل الاتصال ببوابة بايموب");
    } catch {
      toast.error("حدث خطأ في الاتصال بالبوابة");
    } finally {
      setStarting(false);
    }
  };

  if (loadingOrder) {
    return <div className="py-24 text-center text-muted-foreground">جاري تحميل بيانات الدفع...</div>;
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto text-center py-20 border rounded-2xl bg-card">
        <XCircle className="size-12 text-destructive mx-auto" />
        <p className="font-bold text-lg mt-4">الطلب غير موجود</p>
        <button
          onClick={() => navigate("/track")}
          className="mt-5 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold"
        >
          تتبع طلب
        </button>
      </div>
    );
  }

  const payment = order.payments?.[0];
  const paid = payment?.status === "PAID";
  if (paid) {
    return (
      <div className="max-w-md mx-auto text-center py-20 border rounded-2xl bg-card">
        <CheckCircle2 className="size-14 text-emerald-600 mx-auto" />
        <p className="font-bold text-xl mt-4">تم دفع هذا الطلب بالفعل</p>
        <p className="text-sm text-muted-foreground mt-2" dir="ltr">
          {order.orderNumber}
        </p>
        <button
          onClick={() => navigate(`/order/${orderNumber}`)}
          className="mt-6 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold"
        >
          عرض تفاصيل الطلب
        </button>
      </div>
    );
  }

  // طلبات الكاش أو البطاقة عند الاستلام — مفيش دفع إلكتروني مطلوب
  if (order.paymentMethod !== "CARD") {
    return (
      <div className="max-w-md mx-auto text-center py-20 border rounded-2xl bg-card">
        <CheckCircle2 className="size-14 text-emerald-600 mx-auto" />
        <p className="font-bold text-xl mt-4">الطلب مسجل — الدفع عند الاستلام</p>
        <p className="text-sm text-muted-foreground mt-2">
          هتدفع {formatEGP(order.total)} للمندوب وقت التوصيل
        </p>
        <button
          onClick={() => navigate(`/order/${orderNumber}`)}
          className="mt-6 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold"
        >
          عرض تفاصيل الطلب
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/order/${orderNumber}`)}
          className="size-9 rounded-lg border flex items-center justify-center hover:bg-accent transition"
          aria-label="رجوع"
        >
          <ArrowRight className="size-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">إتمام الدفع</h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <ShieldCheck className="size-3" />
            الدفع يتم على صفحة بايموب المشفرة بالكامل
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* زر بدء الدفع */}
        <div className="bg-card border rounded-2xl p-6 sm:p-8 text-center">
          <span className="inline-flex size-16 rounded-2xl bg-primary/10 text-primary items-center justify-center">
            <CreditCard className="size-8" />
          </span>
          <h2 className="font-bold text-xl mt-4">بوابة بايموب الآمنة</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-sm mx-auto">
            هتنتقل لصفحة دفع بايموب الرسمية لإدخال بيانات بطاقتك بأمان تام —
            فيزا، ماستركارد، أو ميجة. بعد نجاح الدفع هترجع للمتجر تلقائيًا.
          </p>
          <div className="flex justify-center gap-2 mt-5 text-[10px] font-bold text-muted-foreground">
            <span className="rounded border px-2 py-1">VISA</span>
            <span className="rounded border px-2 py-1">Mastercard</span>
            <span className="rounded border px-2 py-1">Meeza</span>
            <span className="rounded border px-2 py-1">3D Secure</span>
          </div>

          <button
            onClick={startPaymob}
            disabled={starting}
            className="mt-6 w-full max-w-xs h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-60 mx-auto"
          >
            {starting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                جاري تحويلك لبوابة الدفع...
              </>
            ) : (
              <>
                <ExternalLink className="size-4" />
                ادفع {formatEGP(order.total)} عبر بايموب
              </>
            )}
          </button>

          {payment?.status === "FAILED" && (
            <p className="mt-4 text-xs text-destructive bg-destructive/10 rounded-lg px-3.5 py-2.5">
              محاولة دفع سابقة فشلت — لو الخصم حصل من بطاقتك بدون تأكيد، المبلغ بيرجع تلقائيًا خلال
              أيام العمل. جرب الدفع من جديد.
            </p>
          )}

          <p className="text-[11px] text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            معاملة آمنة — بيانات بطاقتك لا تمر عبر متجرنا نهائيًا
          </p>
        </div>

        {/* ملخص الطلب */}
        <div className="bg-card border rounded-2xl p-5 space-y-4">
          <h2 className="font-bold">ملخص الطلب</h2>
          <p className="price-num text-xs text-muted-foreground" dir="ltr">
            {order.orderNumber}
          </p>
          <div className="space-y-3 max-h-52 overflow-y-auto pe-1">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <img
                  src={item.image || ""}
                  alt={item.productName}
                  className="size-11 rounded-lg object-cover border shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold line-clamp-1">{item.productName}</p>
                  <p className="price-num text-[11px] text-muted-foreground mt-0.5">
                    {item.quantity} × {formatEGP(item.price)}
                  </p>
                </div>
                <span className="price-num text-xs font-bold shrink-0">
                  {formatEGP(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-2 text-sm">
            {order.shipping === 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">الشحن</span>
                <span className="font-bold text-emerald-700">مجاني</span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-muted-foreground">الشحن</span>
                <span className="price-num font-semibold">{formatEGP(order.shipping)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>الخصم</span>
                <span className="price-num font-semibold">-{formatEGP(order.discount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>المطلوب دفعه</span>
              <span className="price-num text-primary">{formatEGP(order.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <span>طريقة الدفع</span>
              <span>{PAYMENT_METHODS[order.paymentMethod] || order.paymentMethod}</span>
            </div>
          </div>
          <button
            onClick={loadOrder}
            className="w-full h-9 rounded-lg border text-xs font-bold hover:bg-accent flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            تحديث حالة الدفع
          </button>
        </div>
      </div>
    </div>
  );
}
