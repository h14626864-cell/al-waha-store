"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Package, Truck, Home, CreditCard } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatEGP, navigate } from "@/lib/shop-utils";
import { PAYMENT_METHODS } from "@/lib/types";

interface OrderData {
  orderNumber: string;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  paymentMethod: string;
  status: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  createdAt: string;
  items: { productName: string; image?: string | null; price: number; quantity: number }[];
  payments?: {
    status: string;
    cardLast4?: string | null;
    reference?: string | null;
  }[];
}

export function OrderSuccessView({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // نجلب الطلب من قائمة الطلبات العامة (endpoint مخصص للعرض)
    fetch(`/api/orders/${orderNumber}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrder(d.order);
      })
      .finally(() => setLoading(false));
  }, [orderNumber]);

  // لو الطلب بالبطاقة ولسه مدفوعش → نوجه لصفحة الدفع
  useEffect(() => {
    if (order && order.paymentMethod === "CARD" && order.payments?.[0]?.status !== "PAID") {
      navigate(`/pay/${orderNumber}`);
    }
  }, [order, orderNumber]);

  if (loading) {
    return <div className="py-24 text-center text-muted-foreground">جاري تحميل الطلب...</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-24 border rounded-2xl bg-card">
        <p className="font-bold text-lg">لم نتمكن من العثور على الطلب</p>
        <button
          onClick={() => navigate("/")}
          className="mt-5 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  const paid = order.payments?.[0]?.status === "PAID";
  const cardPending = order.paymentMethod === "CARD" && !paid;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* رسالة النجاح */}
      <div className="bg-card border rounded-2xl p-8 text-center">
        <div className="size-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
          {paid ? <CreditCard className="size-9 text-emerald-600" /> : <CheckCircle2 className="size-9 text-emerald-600" />}
        </div>
        <h1 className="mt-5 text-2xl font-bold">
          {paid ? "تم الدفع واستلام طلبك بنجاح!" : "تم استلام طلبك بنجاح!"}
        </h1>
        <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
          {paid ? (
            <>
              تم تأكيد دفع{" "}
              <span className="price-num font-bold text-foreground">{formatEGP(order.total)}</span>{" "}
              بنجاح — هنبقى على تواصل معك على رقم{" "}
              <span className="price-num font-bold text-foreground" dir="ltr">
                {order.phone}
              </span>{" "}
              قبل الشحن.
            </>
          ) : cardPending ? (
            "جاري تحويلك لصفحة الدفع الآمن..."
          ) : (
            <>
              شكرًا لثقتك في متجر الواحة. سنتواصل معك على رقم{" "}
              <span className="price-num font-bold text-foreground" dir="ltr">
                {order.phone}
              </span>{" "}
              لتأكيد الطلب قبل الشحن.
            </>
          )}
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5">
          <span className="text-xs text-muted-foreground">رقم الطلب:</span>
          <span className="price-num font-bold text-primary tracking-wide" dir="ltr">
            {order.orderNumber}
          </span>
        </div>
        {paid && order.payments?.[0]?.cardLast4 && (
          <p className="mt-3 text-xs text-muted-foreground price-num" dir="ltr">
            بطاقة تنتهي بـ {order.payments[0].cardLast4} — مرجع العملية: {order.payments[0].reference}
          </p>
        )}
      </div>

      {/* خطوات الطلب */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center justify-between relative">
          <span className="absolute top-4 inset-x-8 h-0.5 bg-border" aria-hidden />
          <span className="absolute top-4 start-8 w-1/3 h-0.5 bg-primary" aria-hidden />
          {[
            { icon: CheckCircle2, label: "تم الاستلام", done: true },
            { icon: Package, label: "التجهيز", done: false },
            { icon: Truck, label: "الشحن", done: false },
            { icon: Home, label: "التوصيل", done: false },
          ].map((s) => (
            <div key={s.label} className="relative flex flex-col items-center gap-1.5 z-10">
              <span
                className={`size-8 rounded-full border-2 flex items-center justify-center ${
                  s.done ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground"
                }`}
              >
                <s.icon className="size-4" />
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* تفاصيل الطلب */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <h2 className="font-bold">تفاصيل الطلب</h2>
        <div className="space-y-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <img
                src={item.image || ""}
                alt={item.productName}
                className="size-12 rounded-lg object-cover border shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold line-clamp-1">{item.productName}</p>
                {(item.size || item.color) && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {[item.size && `مقاس ${item.size}`, item.color].filter(Boolean).join(" — ")}
                  </p>
                )}
                <p className="price-num text-xs text-muted-foreground mt-0.5">
                  {item.quantity} × {formatEGP(item.price)}
                </p>
              </div>
              <span className="price-num text-sm font-bold">
                {formatEGP(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          <Row label="المجموع الفرعي" value={formatEGP(order.subtotal)} />
          <Row
            label="الشحن"
            value={order.shipping === 0 ? "مجاني" : formatEGP(order.shipping)}
          />
          {order.discount > 0 && (
            <Row label="الخصم" value={`-${formatEGP(order.discount)}`} accent />
          )}
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>الإجمالي</span>
            <span className="price-num text-primary">{formatEGP(order.total)}</span>
          </div>
        </div>
        <Separator />
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-accent/50 p-3.5">
            <p className="text-xs text-muted-foreground mb-1">عنوان التوصيل</p>
            <p className="font-semibold leading-relaxed">
              {order.customerName}
              <br />
              {order.city} — {order.address}
            </p>
          </div>
          <div className="rounded-lg bg-accent/50 p-3.5">
            <p className="text-xs text-muted-foreground mb-1">طريقة الدفع</p>
            <p className="font-semibold">{PAYMENT_METHODS[order.paymentMethod] || order.paymentMethod}</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/track")}
          className="h-12 rounded-xl border font-bold text-sm hover:bg-accent transition"
        >
          تتبع طلبك لاحقًا
        </button>
        <button
          onClick={() => navigate("/")}
          className="h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition"
        >
          متابعة التسوق
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? "text-emerald-700" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="price-num font-semibold">{value}</span>
    </div>
  );
}
