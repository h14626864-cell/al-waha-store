"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Package,
  CheckCircle2,
  ClipboardList,
  Truck,
  Home,
  XCircle,
  Loader2,
  CreditCard,
  MapPin,
  Phone,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatEGP, formatDate, navigate } from "@/lib/shop-utils";
import { ORDER_STATUS, PAYMENT_METHODS, type Order, type PaymentInfo } from "@/lib/types";
import { toast } from "sonner";

interface TrackedResponse {
  success: boolean;
  order: Order;
}

// خطوات التتبع — كل خطوة مع الحالة اللي بتقابلها
const STEPS = [
  { key: "PENDING", icon: ClipboardList, label: "تم الاستلام", desc: "طلبك وصلنا وجاري مراجعته" },
  { key: "CONFIRMED", icon: CheckCircle2, label: "تم التأكيد", desc: "تم تأكيد الطلب وتجهيزه" },
  { key: "SHIPPED", icon: Truck, label: "قيد الشحن", desc: "طلبك في الطريق إليك" },
  { key: "DELIVERED", icon: Home, label: "تم التوصيل", desc: "استلمت طلبك بنجاح" },
];

const STEP_INDEX: Record<string, number> = { PENDING: 0, CONFIRMED: 1, SHIPPED: 2, DELIVERED: 3 };

interface TrackedOrder extends Order {
  payments?: PaymentInfo[];
}

// صفحة تتبع الطلب برقمه — متاحة للزوار بدون تسجيل
export function TrackView({ initialOrderNumber }: { initialOrderNumber?: string }) {
  const [input, setInput] = useState(initialOrderNumber || "");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const track = useCallback(async (num: string) => {
    const orderNumber = num.trim().toUpperCase();
    if (!orderNumber) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`);
      const data: TrackedResponse = await res.json();
      if (data.success) {
        setOrder({ ...data.order });
      } else {
        setOrder(null);
        setError("لا يوجد طلب بهذا الرقم — تأكد من الرقم وحاول مرة أخرى");
      }
    } catch {
      setOrder(null);
      setError("حدث خطأ في الاتصال — حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }, []);

  // تتبع تلقائي إذا جاينا برقم من الرابط (#/track?order=WH-xxx)
  useEffect(() => {
    if (initialOrderNumber) track(initialOrderNumber);
  }, [initialOrderNumber, track]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold">تتبع طلبك</h1>
        <p className="text-sm text-muted-foreground mt-2">
          أدخل رقم الطلب (مثال: WH-250901-1234) لمعرفة حالة طلبك لحظة بلحظة
        </p>
      </div>

      {/* البحث */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          track(input);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="رقم الطلب — مثال: WH-250908-5616"
            dir="ltr"
            className="w-full h-12 rounded-xl border bg-card ps-10 pe-4 text-sm outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition text-start"
            aria-label="رقم الطلب"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition disabled:opacity-60 flex items-center gap-2"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "تتبع"}
        </button>
      </form>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
          <XCircle className="size-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive mt-2">{error}</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            نسيت رقم طلبك؟{" "}
            <button onClick={() => navigate("/account")} className="text-primary font-bold hover:underline">
              سجّل دخولك واعرض طلباتك
            </button>
          </p>
        </div>
      )}

      {order && <TrackTimeline order={order} />}
    </div>
  );
}

// الخط الزمني لحالة الطلب
export function TrackTimeline({ order }: { order: TrackedOrder }) {
  const cancelled = order.status === "CANCELLED";
  const currentIdx = STEP_INDEX[order.status] ?? 0;
  const payment = order.payments?.[0];

  return (
    <div className="space-y-5">
      {/* بطاقة ملخص الطلب */}
      <div className="bg-card border rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">رقم الطلب</p>
            <p className="price-num text-lg font-bold text-primary" dir="ltr">
              {order.orderNumber}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{formatDate(order.createdAt)}</p>
          </div>
          <span
            className={`w-fit text-xs font-bold px-3.5 py-2 rounded-full border ${
              (ORDER_STATUS[order.status] || ORDER_STATUS.PENDING).color
            }`}
          >
            {(ORDER_STATUS[order.status] || ORDER_STATUS.PENDING).label}
          </span>
        </div>

        <Separator className="my-5" />

        {/* الخطوات */}
        {cancelled ? (
          <div className="text-center py-4">
            <XCircle className="size-12 text-destructive mx-auto" />
            <p className="font-bold mt-3">تم إلغاء هذا الطلب</p>
            <p className="text-sm text-muted-foreground mt-1">
              لو مطلوب أي مساعدة تواصل معنا من صفحة الدعم
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const done = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={step.key} className="flex gap-4">
                  {/* العمود الأيقونة */}
                  <div className="flex flex-col items-center">
                    <span
                      className={`size-10 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                        done
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-card border-border text-muted-foreground/40"
                      } ${isCurrent ? "ring-4 ring-primary/15" : ""}`}
                    >
                      <step.icon className="size-4.5" />
                    </span>
                    {i < STEPS.length - 1 && (
                      <span
                        className={`w-0.5 flex-1 min-h-8 ${i < currentIdx ? "bg-primary" : "bg-border"}`}
                      />
                    )}
                  </div>
                  {/* النص */}
                  <div className={`pb-6 ${i === STEPS.length - 1 ? "pb-0" : ""}`}>
                    <p className={`font-bold text-sm ${done ? "" : "text-muted-foreground"}`}>
                      {step.label}
                      {isCurrent && (
                        <span className="ms-2 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          المرحلة الحالية
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* حالة الدفع */}
      {payment && (
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <span
            className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
              payment.status === "PAID"
                ? "bg-emerald-50 text-emerald-600"
                : payment.status === "FAILED"
                  ? "bg-red-50 text-destructive"
                  : "bg-amber-50 text-amber-600"
            }`}
          >
            <CreditCard className="size-5" />
          </span>
          <div className="flex-1">
            <p className="font-bold text-sm">
              {payment.status === "PAID"
                ? "تم الدفع بنجاح"
                : payment.status === "FAILED"
                  ? "فشلت عملية الدفع"
                  : "بانتظار الدفع"}
            </p>
            {payment.cardLast4 && (
              <p className="text-xs text-muted-foreground price-num mt-0.5" dir="ltr">
                بطاقة تنتهي بـ {payment.cardLast4} — مرجع: {payment.reference}
              </p>
            )}
          </div>
          {payment.status !== "PAID" && order.paymentMethod === "CARD" && (
            <button
              onClick={() => navigate(`/pay/${order.orderNumber}`)}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
            >
              ادفع الآن
            </button>
          )}
        </div>
      )}

      {/* تفاصيل الطلب */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <h3 className="font-bold">تفاصيل الطلب</h3>
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
              <span className="price-num text-sm font-bold shrink-0">
                {formatEGP(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-base">
          <span>الإجمالي</span>
          <span className="price-num text-primary">{formatEGP(order.total)}</span>
        </div>
        <Separator />
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-accent/50 p-3.5">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              عنوان التوصيل
            </p>
            <p className="font-semibold leading-relaxed">
              {order.customerName}
              <br />
              {order.city} — {order.address}
            </p>
          </div>
          <div className="rounded-lg bg-accent/50 p-3.5">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <Phone className="size-3.5" />
              طريقة الدفع
            </p>
            <p className="font-semibold">
              {PAYMENT_METHODS[order.paymentMethod] || order.paymentMethod}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
