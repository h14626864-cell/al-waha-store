"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Banknote, CreditCard, Smartphone, Loader2, Lock, Wallet, Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useCart, useAppliedCoupon, useCustomer } from "@/lib/store";
import { formatEGP, navigate } from "@/lib/shop-utils";
import type { StoreSettings } from "@/lib/types";
import { GOVERNORATES, rateForCity } from "@/lib/egypt";
import { toast } from "sonner";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^01[0-9]{9}$/;

export function CheckoutView() {
  const { lines, clear } = useCart();
  const { code, percent, reset } = useAppliedCoupon();
  const { customer } = useCustomer();
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    notes: "",
    paymentMethod: "COD",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // جلب إعدادات المتجر (طرق الدفع المتاحة + رسوم الشحن)
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStoreSettings(d.settings);
          // لو الكاش مش متاح وبايموب مفعّل → ابدأ ببايموب
          if (!d.settings.cod_enabled && d.settings.card_payment_enabled) {
            setForm((f) => ({ ...f, paymentMethod: "CARD" }));
          }
        }
      })
      .catch(() => {});
  }, []);

  // تعبئة تلقائية من حساب العميل المسجل
  useEffect(() => {
    if (customer) {
      setForm((f) => ({
        ...f,
        customerName: f.customerName || customer.name,
        email: f.email || customer.email,
        phone: f.phone || customer.phone || "",
      }));
    }
  }, [customer]);

  // ============ استرجاع سلة متروكة: تعبئة بيانات العميل من رابط الإيميل ============
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("alwaha-recover");
      if (raw) {
        const rec = JSON.parse(raw) as { customerName?: string; phone?: string; email?: string; city?: string };
        setForm((f) => ({
          ...f,
          customerName: f.customerName || rec.customerName || "",
          phone: f.phone || rec.phone || "",
          email: f.email || rec.email || "",
          city: f.city || rec.city || "",
        }));
        sessionStorage.removeItem("alwaha-recover");
        toast.success("تمت تعبئة بياناتك — كمّل طلبك ✨");
      }
    } catch {
      sessionStorage.removeItem("alwaha-recover");
    }
  }, []);

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const freeThreshold = Number(storeSettings?.free_shipping_threshold) || 3000;
  const rates = (storeSettings?.shipping_rates as Record<string, number>) || {};
  const shippingCost = rateForCity(rates, form.city, Number(storeSettings?.shipping_fee) || 65);
  const shipping = subtotal >= freeThreshold ? 0 : subtotal > 0 ? shippingCost : 0;
  const discount = code ? Math.round(subtotal * (percent / 100) * 100) / 100 : 0;
  const total = Math.max(0, subtotal + shipping - discount);

  const setField = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  // ============ التقاط السلة المتروكة ============
  // أول ما العميل يكتب إيميل صحيح أو رقم موبايل صحيح مع سلة مش فاضية
  // بنحفظ لقطة من السلة في السيرفر — عشان الأدمن يقدر يبعتله لينك إكمال الطلب لو ساب الصفحة
  const captureRef = useRef<number | null>(null);
  const captureCart = useCallback(
    (keepalive = false) => {
      if (lines.length === 0) return;
      const email = form.email.trim();
      const phone = form.phone.trim();
      if (!EMAIL_RE.test(email) && !PHONE_RE.test(phone)) return; // مفيش وسيلة تواصل صالحة
      const payload = {
        customerName: form.customerName.trim() || undefined,
        email: email || undefined,
        phone: phone || undefined,
        city: form.city || undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          size: l.size,
          color: l.color,
          variantId: l.variantId,
          variantName: l.variantName,
        })),
      };
      fetch("/api/abandoned-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive,
      }).catch(() => {});
    },
    [lines, form.email, form.phone, form.customerName, form.city]
  );

  // التقاط تلقائي مع debounce بعد أي تغيير في بيانات التواصل أو السلة
  useEffect(() => {
    if (captureRef.current) window.clearTimeout(captureRef.current);
    captureRef.current = window.setTimeout(() => captureCart(false), 1500);
    return () => {
      if (captureRef.current) window.clearTimeout(captureRef.current);
    };
  }, [captureCart]);

  // لو ساب الصفحة فجأة (إغلاق التبويب/التنقل) → إرسال فوري keepalive
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") captureCart(true);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [captureCart]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.customerName.trim()) e.customerName = "أدخل الاسم بالكامل";
    else if (form.customerName.trim().length < 5) e.customerName = "الاسم قصير جدًا";
    if (!form.phone.trim()) e.phone = "أدخل رقم الهاتف";
    else if (!/^01[0-9]{9}$/.test(form.phone.trim()))
      e.phone = "رقم غير صحيح — يبدأ بـ 01 و 11 رقم";
    if (!form.city) e.city = "اختار المحافظة";
    if (!form.address.trim()) e.address = "أدخل العنوان بالتفصيل";
    else if (form.address.trim().length < 10) e.address = "العنوان قصير — اكتب التفاصيل";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "بريد غير صحيح";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      toast.error("راجع الحقول المطلوبة");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          couponCode: code || undefined,
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            size: l.size,
            color: l.color,
            variantId: l.variantId,
            variantName: l.variantName,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        const orderNumber = data.order.orderNumber;
        clear();
        reset();

        // الدفع بالبطاقة → بوابة بايموب الحقيقية
        if (form.paymentMethod === "CARD") {
          try {
            const payRes = await fetch("/api/payments/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderNumber }),
            });
            const payData = await payRes.json();
            if (payData.success && payData.mode === "paymob" && payData.redirectUrl) {
              window.location.href = payData.redirectUrl; // صفحة دفع بايموب الآمنة
              return;
            }
            // فشل بدء الدفع → صفحة الدفع فيها زر إعادة المحاولة
            toast.error(payData.error || "فشل الاتصال ببوابة الدفع");
            navigate(`/pay/${orderNumber}`);
            return;
          } catch {
            toast.error("فشل الاتصال ببوابة الدفع");
            navigate(`/pay/${orderNumber}`);
            return;
          }
        }

        navigate(`/order/${orderNumber}`);
      } else {
        toast.error(data.error || "فشل إنشاء الطلب");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال — حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="text-center py-24 border rounded-2xl bg-card">
        <p className="font-bold text-xl">سلتك فاضية</p>
        <button
          onClick={() => navigate("/")}
          className="mt-5 rounded-xl bg-primary text-primary-foreground px-7 py-3 text-sm font-bold hover:bg-primary/90"
        >
          ابدأ التسوق
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate("/cart")}
          className="size-9 rounded-lg border flex items-center justify-center hover:bg-accent transition"
          aria-label="رجوع للسلة"
        >
          <ArrowRight className="size-4" />
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold">إتمام الطلب</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* بيانات الشحن */}
        <div className="bg-card border rounded-xl p-5 sm:p-6 space-y-5">
          <h2 className="font-bold text-lg">بيانات التوصيل</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="الاسم بالكامل *" error={errors.customerName}>
              <input
                value={form.customerName}
                onChange={(e) => setField("customerName", e.target.value)}
                placeholder="مثال: أحمد محمود سالم"
                className={inputCls(!!errors.customerName)}
              />
            </Field>
            <Field label="رقم الهاتف *" error={errors.phone}>
              <input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="01xxxxxxxxx"
                inputMode="numeric"
                maxLength={11}
                dir="ltr"
                className={`${inputCls(!!errors.phone)} text-end`}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="المحافظة *" error={errors.city}>
              <select
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                className={`${inputCls(!!errors.city)} appearance-none`}
              >
                <option value="">اختار المحافظة...</option>
                {GOVERNORATES.map((c) => {
                  const fee = rateForCity(rates, c, Number(storeSettings?.shipping_fee) || 65);
                  const isFree = subtotal >= freeThreshold;
                  return (
                    <option key={c} value={c}>
                      {c} — الشحن {isFree ? "مجاني" : `${fee} ج.م`}
                    </option>
                  );
                })}
              </select>
            </Field>
            <Field label="البريد الإلكتروني (لتأكيد الطلب والعروض)">
              <input
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="example@mail.com"
                type="email"
                dir="ltr"
                className={`${inputCls(!!errors.email)} text-end`}
              />
            </Field>
          </div>

          {/* تنبيه صغير: بنحفظ السلة لو ساب الصفحة */}
          {(EMAIL_RE.test(form.email.trim()) || PHONE_RE.test(form.phone.trim())) && lines.length > 0 && (
            <p className="text-[11px] text-muted-foreground bg-accent/50 rounded-lg px-3.5 py-2 flex items-center gap-2">
              <Mail className="size-3.5 shrink-0 text-primary" />
              سلتك محفوظة تلقائيًا — لو سبت الشراء هنبعتلك لينك تكمّل بيه طلبك زي ما هو.
            </p>
          )}

          <Field label="العنوان بالتفصيل *" error={errors.address}>
            <input
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="المدينة، الشارع، رقم العمارة، الدور، الشقة"
              className={inputCls(!!errors.address)}
            />
          </Field>

          <Field label="ملاحظات للمندوب (اختياري)">
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="مثال: اتصل قبل الوصول، العمود بجانب المدخل..."
              rows={2}
              className={`${inputCls(false)} resize-none`}
            />
          </Field>

          <Separator />

          {/* طريقة الدفع */}
          <div>
            <h3 className="font-bold mb-3">طريقة الدفع</h3>
            {(() => {
              const s = storeSettings;
              const methods = [
                s?.card_payment_enabled
                  ? { value: "CARD", label: "بطاقة بنكية — Paymob", desc: "فيزا / ماستركارد / ميجة آمن", icon: CreditCard, paymob: true }
                  : null,
                s?.cod_enabled
                  ? { value: "COD", label: "كاش عند الاستلام", desc: "ادفع كاش للمندوب", icon: Banknote, paymob: false }
                  : null,
                s?.card_on_delivery_enabled
                  ? { value: "CARD_ON_DELIVERY", label: "بطاقة عند الاستلام", desc: "POS مع المندوب", icon: Smartphone, paymob: false }
                  : null,
              ].filter(Boolean) as { value: string; label: string; desc: string; icon: typeof CreditCard; paymob: boolean }[];

              if (methods.length === 0) {
                return (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3.5 py-3">
                    لا توجد طرق دفع متاحة حاليًا — تواصل معنا
                  </p>
                );
              }

              return (
                <div className={methods.length > 2 ? "grid sm:grid-cols-3 gap-2.5" : "grid sm:grid-cols-2 gap-2.5"}>
                  {methods.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setField("paymentMethod", m.value)}
                      className={`flex flex-col items-start gap-1.5 rounded-xl border p-4 text-start transition ${
                        form.paymentMethod === m.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:border-ring/50"
                      }`}
                    >
                      <m.icon className={`size-5 ${form.paymentMethod === m.value ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-bold">{m.label}</span>
                      <span className="text-[10px] text-muted-foreground">{m.desc}</span>
                      {m.paymob && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                          <Lock className="size-2.5" />
                          دفع آمن الآن
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })()}
            {form.paymentMethod === "CARD" && (
              <p className="mt-3 text-xs text-muted-foreground bg-accent/50 rounded-lg px-3.5 py-2.5 leading-relaxed flex items-start gap-2">
                <Wallet className="size-4 shrink-0 text-primary mt-0.5" />
                بعد تأكيد الطلب هتنتقل مباشرة لصفحة دفع بايموب الآمنة لإدخال بيانات بطاقتك —
                فيزا، ماستركارد، أو ميجة، والعملية بتتم في صفحة بايموب المشفرة بالكامل.
              </p>
            )}
          </div>
        </div>

        {/* الملخص */}
        <div className="bg-card border rounded-xl p-5 lg:sticky lg:top-36 space-y-4">
          <h2 className="font-bold text-lg">طلبك ({lines.length})</h2>
          <div className="space-y-3 max-h-56 overflow-y-auto pe-1">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3">
                <img
                  src={l.image}
                  alt={l.name}
                  className="size-12 rounded-lg object-cover border shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold line-clamp-1">{l.name}</p>
                  {(l.size || l.color || l.variantName) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {[l.size && `مقاس ${l.size}`, l.color, l.variantName].filter(Boolean).join(" — ")}
                    </p>
                  )}
                  <p className="price-num text-[11px] text-muted-foreground mt-0.5">
                    {l.quantity} × {formatEGP(l.price)}
                  </p>
                </div>
                <span className="price-num text-xs font-bold shrink-0">
                  {formatEGP(l.price * l.quantity)}
                </span>
              </div>
            ))}
          </div>
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
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                جاري تأكيد الطلب...
              </>
            ) : (
              "تأكيد الطلب الآن"
            )}
          </button>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            بالضغط على تأكيد الطلب أنت توافق على سياسة الاستبدال والاسترجاع الخاصة بالمتجر
          </p>
        </div>
      </div>
    </div>
  );
}

function inputCls(hasError: boolean): string {
  return `w-full h-11 rounded-lg border bg-background px-3.5 text-sm outline-none focus:ring-2 transition ${
    hasError
      ? "border-destructive focus:ring-destructive/30"
      : "focus:ring-ring/30 focus:border-ring"
  }`;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}
