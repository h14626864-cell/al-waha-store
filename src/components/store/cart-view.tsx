"use client";

import { useState } from "react";
import { ShoppingBag, Minus, Plus, Trash2, ArrowLeft, Tag, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useCart, useAppliedCoupon } from "@/lib/store";
import { formatEGP, navigate } from "@/lib/shop-utils";
import { toast } from "sonner";

export const FREE_SHIPPING_THRESHOLD = 3000;
export const SHIPPING_COST = 60;

export function CartView() {
  const { lines, setQty, remove } = useCart();
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const { code, percent, apply, reset } = useAppliedCoupon();
  const [couponInput, setCouponInput] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : subtotal > 0 ? SHIPPING_COST : 0;
  const discount = code ? Math.round(subtotal * (percent / 100) * 100) / 100 : 0;
  const total = Math.max(0, subtotal + shipping - discount);

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput }),
      });
      const data = await res.json();
      if (data.success) {
        apply(data.coupon.code, data.coupon.discountPercent);
        toast.success(`تم تطبيق خصم ${data.coupon.discountPercent}%`);
      } else {
        toast.error(data.error || "كود الخصم غير صالح");
      }
    } catch {
      toast.error("حدث خطأ أثناء التحقق من الكود");
    } finally {
      setCheckingCoupon(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="text-center py-24 border rounded-2xl bg-card">
        <ShoppingBag className="size-14 text-muted-foreground/30 mx-auto" />
        <p className="mt-5 font-bold text-xl">سلتك فاضية</p>
        <p className="text-sm text-muted-foreground mt-2">
          ابدأ التسوق واكتشف منتجاتنا المميزة
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-7 py-3 text-sm font-bold hover:bg-primary/90 transition"
        >
          <ArrowLeft className="size-4" />
          ابدأ التسوق
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">سلة التسوق</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* عناصر السلة */}
        <div className="space-y-3">
          {lines.map((line) => (
            <div
              key={line.id}
              className="flex gap-4 bg-card border rounded-xl p-3.5"
            >
              <a href={`#/product/${line.slug}`} className="shrink-0">
                <img
                  src={line.image}
                  alt={line.name}
                  className="size-20 sm:size-24 rounded-lg object-cover border"
                />
              </a>
              <div className="flex-1 min-w-0 flex flex-col">
                <a
                  href={`#/product/${line.slug}`}
                  className="font-semibold text-sm sm:text-base line-clamp-2 hover:text-primary transition"
                >
                  {line.name}
                </a>
                {/* المقاس واللون والخيار المختار */}
                {(line.size || line.color || line.variantName) && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {line.size && (
                      <span className="text-[11px] font-semibold bg-accent rounded-md px-2 py-0.5">
                        المقاس: {line.size}
                      </span>
                    )}
                    {line.color && (
                      <span className="text-[11px] font-semibold bg-accent rounded-md px-2 py-0.5">
                        اللون: {line.color}
                      </span>
                    )}
                    {line.variantName && (
                      <span className="text-[11px] font-semibold bg-accent rounded-md px-2 py-0.5">
                        {line.variantName}
                      </span>
                    )}
                  </div>
                )}
                <span className="price-num text-sm text-primary font-bold mt-1">
                  {formatEGP(line.price)}
                </span>
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <div className="flex items-center border rounded-lg overflow-hidden h-9">
                    <button
                      onClick={() => setQty(line.id, line.quantity + 1)}
                      disabled={line.quantity >= line.stock}
                      className="w-9 h-full flex items-center justify-center hover:bg-accent disabled:opacity-30"
                      aria-label="زيادة"
                    >
                      <Plus className="size-3.5" />
                    </button>
                    <span className="price-num w-9 text-center text-sm font-bold">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => setQty(line.id, line.quantity - 1)}
                      className="w-9 h-full flex items-center justify-center hover:bg-accent"
                      aria-label="تقليل"
                    >
                      <Minus className="size-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      remove(line.id);
                      toast("تم حذف المنتج من السلة");
                    }}
                    className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                    aria-label="حذف من السلة"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ملخص الطلب */}
        <div className="bg-card border rounded-xl p-5 lg:sticky lg:top-36 space-y-4">
          <h2 className="font-bold text-lg">ملخص الطلب</h2>

          {/* كود الخصم */}
          {code ? (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5">
              <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                <Check className="size-4" />
                كود {code} — خصم {percent}%
              </p>
              <button
                onClick={() => {
                  reset();
                  toast("تم إزالة الكود");
                }}
                className="text-xs text-emerald-700 hover:underline font-medium"
              >
                إزالة
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="كود الخصم"
                  className="w-full h-10 rounded-lg border bg-background ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  aria-label="كود الخصم"
                />
              </div>
              <button
                onClick={applyCoupon}
                disabled={checkingCoupon || !couponInput.trim()}
                className="h-10 px-4 rounded-lg bg-secondary text-secondary-foreground text-sm font-bold hover:bg-secondary/80 disabled:opacity-40 transition"
              >
                {checkingCoupon ? "..." : "تطبيق"}
              </button>
            </div>
          )}

          <Separator />
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">المجموع الفرعي</span>
              <span className="price-num font-semibold">{formatEGP(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الشحن</span>
              <span className="price-num font-semibold">
                {shipping === 0 ? (
                  <span className="text-emerald-700 font-bold">مجاني</span>
                ) : (
                  formatEGP(shipping)
                )}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>الخصم ({percent}%)</span>
                <span className="price-num font-semibold">-{formatEGP(discount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>الإجمالي</span>
              <span className="price-num text-primary">{formatEGP(total)}</span>
            </div>
          </div>

          {subtotal < FREE_SHIPPING_THRESHOLD && (
            <p className="text-xs text-muted-foreground bg-accent/60 rounded-lg px-3 py-2.5 leading-relaxed">
              أضف منتجات بقيمة{" "}
              <span className="price-num font-bold text-foreground">
                {formatEGP(FREE_SHIPPING_THRESHOLD - subtotal)}
              </span>{" "}
              للحصول على شحن مجاني
            </p>
          )}

          <button
            onClick={() => navigate("/checkout")}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition"
          >
            إتمام الشراء
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full h-10 rounded-xl border text-sm font-semibold hover:bg-accent transition"
          >
            متابعة التسوق
          </button>
        </div>
      </div>
    </div>
  );
}
