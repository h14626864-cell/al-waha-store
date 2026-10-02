"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Settings2,
  Save,
  Loader2,
  CreditCard,
  Megaphone,
  Info,
  Store,
  Truck,
  Upload,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Bell,
  Send,
  Timer,
  Trash2,
  MapPin,
  Mail,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { GOVERNORATES, DEFAULT_SHIPPING_RATES } from "@/lib/egypt";

const inputCls =
  "w-full h-11 rounded-lg border bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/30 transition";

type Tab = "identity" | "payment" | "shipping" | "announce" | "notify" | "email";

interface WaLog {
  id: string;
  orderNumber: string;
  to: string;
  event: string;
  status: string;
  error?: string | null;
  createdAt: string;
}

const EVENT_LABEL: Record<string, string> = {
  SHIPMENT_UPDATE: "تحديث شحنة",
  SHIPMENT_CREATED: "إنشاء شحنة",
  ORDER_STATUS: "حالة الطلب",
  TEST: "رسالة تجريبية",
  NOTIFY: "إشعار",
};

// إعدادات المتجر: الهوية (اسم ولوجو) + بوابة بايموب + الشحن + الإعلانات
export function SettingsAdmin() {
  const [tab, setTab] = useState<Tab>("identity");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [paymobReady, setPaymobReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [waLogs, setWaLogs] = useState<WaLog[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  // أسعار الشحن لكل محافظة (ج.م)
  const [rates, setRates] = useState<Record<string, number>>({ ...DEFAULT_SHIPPING_RATES });

  // سجل الإشعارات — بنجيبه لما تبويب الإشعارات يتفتح
  const loadWaLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp");
      const data = await res.json();
      if (data.success) setWaLogs(data.logs || []);
    } catch {
      /* تجاهل */
    }
  }, []);

  useEffect(() => {
    if (tab === "notify") loadWaLogs();
  }, [tab, loadWaLogs]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setPaymobReady(!!data.paymobReady);
        // قراءة جدول أسعار الشحن المحفوظ (أو الافتراضي)
        try {
          const saved = JSON.parse(data.settings.shipping_rates || "{}");
          const merged: Record<string, number> = { ...DEFAULT_SHIPPING_RATES };
          for (const gov of GOVERNORATES) {
            const v = Number(saved[gov]);
            if (!isNaN(v) && v >= 0) merged[gov] = v;
          }
          setRates(merged);
        } catch {
          setRates({ ...DEFAULT_SHIPPING_RATES });
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: string, value: string) => setSettings((s) => ({ ...s, [key]: value }));
  const toggle = (key: string) =>
    setSettings((s) => ({ ...s, [key]: s[key] === "true" ? "false" : "true" }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, shipping_rates: JSON.stringify(rates) }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم حفظ الإعدادات — التغييرات ظاهرة في المتجر فورًا");
        load();
      } else {
        toast.error(data.error || "فشل الحفظ");
      }
    } finally {
      setSaving(false);
    }
  };

  // رفع اللوجو
  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        set("store_logo", data.url);
        toast.success("تم رفع اللوجو — اضغط حفظ لتطبيقه");
      } else {
        toast.error(data.error || "فشل رفع الصورة");
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  // إرسال رسالة واتساب تجريبية
  const sendTestWa = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testPhone }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`اتبعتت رسالة تجريبية على ${data.to} — افتحي واتساب وشوفي`);
        setTestPhone("");
      } else {
        toast.error(data.error || "فشل الإرسال");
      }
      loadWaLogs();
    } finally {
      setTesting(false);
    }
  };

  // ضبط سريع لمؤقت العروض (datetime-local بصيغة محلية)
  const quickCountdown = (hours: number) => {
    const d = new Date(Date.now() + hours * 3600 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    set(
      "offers_countdown_end",
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
    toast.success("اتظبط الوقت — اضغطي حفظ كل الإعدادات");
  };

  // إرسال إيميل تجريبي للتأكد من إعدادات البريد
  const sendTestEmail = async () => {
    setTestingEmail(true);
    try {
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success((data.message || "اتبعت الإيميل التجريبي") + " — لو مش لاقياه شوف مجلد Spam واضغطي مش سبام", { duration: 6000 });
        setTestEmail("");
      } else {
        toast.error(data.error || "فشل الإرسال");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-muted-foreground">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings2 className="size-5 text-primary" />
          إعدادات المتجر
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          اسم المتجر واللوجو، بوابة دفع Paymob، وتكامل شركة الشحن — كل حاجة من هنا
        </p>
      </div>

      {/* التبويبات */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { key: "identity", label: "هوية المتجر", icon: Store },
            { key: "payment", label: "بوابة الدفع Paymob", icon: CreditCard },
            { key: "shipping", label: "الشحن وشركة الشحن", icon: Truck },
            { key: "email", label: "البريد الإلكتروني", icon: Mail },
            { key: "notify", label: "الإشعارات والعروض", icon: Bell },
            { key: "announce", label: "الإعلانات وطرق الدفع", icon: Megaphone },
          ] as { key: Tab; label: string; icon: typeof Store }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`h-9 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-accent/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ============ هوية المتجر ============ */}
      {tab === "identity" && (
        <section className="bg-card border rounded-xl p-5 space-y-4">
          <h2 className="font-bold flex items-center gap-2">
            <Store className="size-4.5 text-primary" />
            اسم المتجر واللوجو
          </h2>

          {/* اللوجو الحالي */}
          <div className="flex items-center gap-4">
            {settings.store_logo ? (
              <img
                src={settings.store_logo}
                alt="لوجو المتجر"
                className="size-20 rounded-xl object-cover border"
              />
            ) : (
              <span className="size-20 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                {(settings.store_name || "و")[0]}
              </span>
            )}
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadLogo(f);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingLogo}
                className="h-9 px-4 rounded-lg border text-xs font-bold hover:bg-accent flex items-center gap-1.5 disabled:opacity-60"
              >
                {uploadingLogo ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                {uploadingLogo ? "جاري الرفع..." : "رفع لوجو جديد"}
              </button>
              {settings.store_logo && (
                <button
                  onClick={() => set("store_logo", "")}
                  className="block text-[11px] text-destructive font-semibold hover:underline"
                >
                  حذف اللوجو (رجوع للافتراضي)
                </button>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="اسم المتجر بالعربي">
              <input
                value={settings.store_name || ""}
                onChange={(e) => set("store_name", e.target.value)}
                placeholder="الواحة"
                className={inputCls}
              />
            </Field>
            <Field label="اسم المتجر بالإنجليزي (تحت الاسم)">
              <input
                value={settings.store_name_en || ""}
                onChange={(e) => set("store_name_en", e.target.value)}
                placeholder="Al-Waha Store"
                dir="ltr"
                className={`${inputCls} text-end`}
              />
            </Field>
          </div>
          <Field label="الشعار التسويقي (يظهر في القوائم)">
            <input
              value={settings.store_tagline || ""}
              onChange={(e) => set("store_tagline", e.target.value)}
              placeholder="تسوق بثقة، توصيل سريع"
              className={inputCls}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="البريد الإلكتروني">
              <input
                value={settings.store_email || ""}
                onChange={(e) => set("store_email", e.target.value)}
                placeholder="support@store.com"
                dir="ltr"
                className={`${inputCls} text-end`}
              />
            </Field>
            <Field label="رقم خدمة العملاء">
              <input
                value={settings.support_phone || ""}
                onChange={(e) => set("support_phone", e.target.value)}
                placeholder="19999"
                dir="ltr"
                className={`${inputCls} text-end`}
              />
            </Field>
          </div>
          <Field label="عنوان المتجر">
            <input
              value={settings.store_address || ""}
              onChange={(e) => set("store_address", e.target.value)}
              placeholder="٢٧ شارع التحرير، وسط البلد، القاهرة"
              className={inputCls}
            />
          </Field>
        </section>
      )}

      {/* ============ بوابة الدفع Paymob ============ */}
      {tab === "payment" && (
        <section className="space-y-4">
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <CreditCard className="size-4.5 text-primary" />
                بوابة الدفع الإلكتروني — Paymob
              </h2>
              {paymobReady ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
                  <CheckCircle2 className="size-3.5" />
                  مفعّلة وشغالة
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                  <XCircle className="size-3.5" />
                  غير مفعّلة
                </span>
              )}
            </div>

            <div className="rounded-lg bg-accent/50 border px-4 py-3 text-xs leading-relaxed flex gap-2.5">
              <Info className="size-4 shrink-0 text-primary" />
              <div>
                <p className="font-bold text-primary mb-1">إزاي تفعّل بايموب؟</p>
                <ol className="text-muted-foreground space-y-1 list-decimal ps-4">
                  <li>
                    اعمل حساب تاجر على{" "}
                    <a
                      href="https://paymob.com/eg"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
                    >
                      paymob.com <ExternalLink className="size-3" />
                    </a>{" "}
                    (بياخد بضعة أيام لتفعيل الحساب الحقيقي).
                  </li>
                  <li>من لوحة تحكم بايموب: Developers → API Key → انسخه وحطه هنا.</li>
                  <li>من Payment Integrations → فعّل Online Card وانسخ رقم الـ Integration ID.</li>
                  <li>من Payment Templates → New → IFrame → انسخ رقم الـ IFrame ID.</li>
                  <li>
                    مهم: في إعدادات الـ IFrame حط رابط الرجوع (Post URL):
                    <span className="price-num block bg-background border rounded px-2 py-1 mt-1 break-all" dir="ltr">
                      https://اسم-موقعك.com/#/paymob/return
                    </span>
                  </li>
                  <li>لو فعّلت الـ Webhook، حط رابطه كمان (Transaction processed callback):</li>
                </ol>
                <span className="price-num block bg-background border rounded px-2 py-1 mt-1 break-all" dir="ltr">
                  https://اسم-موقعك.com/api/paymob/webhook
                </span>
              </div>
            </div>

            <Field label="Paymob API Key">
              <input
                value={settings.paymob_api_key || ""}
                onChange={(e) => set("paymob_api_key", e.target.value)}
                placeholder="ZXlKaGJHY2lPaUpJVXpVeE3pN..."
                dir="ltr"
                type="password"
                className={`${inputCls} text-end`}
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Card Integration ID">
                <input
                  value={settings.paymob_card_integration_id || ""}
                  onChange={(e) => set("paymob_card_integration_id", e.target.value)}
                  placeholder="4556123"
                  dir="ltr"
                  inputMode="numeric"
                  className={`${inputCls} text-end`}
                />
              </Field>
              <Field label="IFrame ID">
                <input
                  value={settings.paymob_iframe_id || ""}
                  onChange={(e) => set("paymob_iframe_id", e.target.value)}
                  placeholder="835641"
                  dir="ltr"
                  inputMode="numeric"
                  className={`${inputCls} text-end`}
                />
              </Field>
            </div>
            <Field label="HMAC Secret (للتأكد من صحة إشعارات الدفع)">
              <input
                value={settings.paymob_hmac_secret || ""}
                onChange={(e) => set("paymob_hmac_secret", e.target.value)}
                placeholder="من Developers → HMAC Secret"
                dir="ltr"
                type="password"
                className={`${inputCls} text-end`}
              />
            </Field>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              لما تضيف المفاتيح وتحفظ، خيار &quot;بطاقة بنكية — Paymob&quot; هيظهر للعملاء في صفحة
              الدفع فورًا والدفع هيتم على صفحة بايموب الرسمية المشفرة.
            </p>
          </div>
        </section>
      )}

      {/* ============ الشحن ============ */}
      {tab === "shipping" && (
        <section className="space-y-4">
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <h2 className="font-bold flex items-center gap-2">
              <Truck className="size-4.5 text-primary" />
              إعدادات الشحن العامة
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="سعر الشحن الافتراضي (ج.م)">
                <input
                  value={settings.shipping_fee || ""}
                  onChange={(e) => set("shipping_fee", e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="65"
                  inputMode="decimal"
                  className={`${inputCls} price-num text-end`}
                />
              </Field>
              <Field label="شحن مجاني للطلبات فوق (ج.م)">
                <input
                  value={settings.free_shipping_threshold || ""}
                  onChange={(e) =>
                    set("free_shipping_threshold", e.target.value.replace(/[^\d.]/g, ""))
                  }
                  placeholder="3000"
                  inputMode="decimal"
                  className={`${inputCls} price-num text-end`}
                />
              </Field>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed flex gap-2">
              <Info className="size-3.5 shrink-0 mt-0.5 text-primary" />
              السعر الافتراضي بيتطبق على أي محافظة ملهاش سعر محدد في الجدول اللي تحت. والشحن بيبقى
              مجاني تلقائيًا لو قيمة الطلب وصلت للحد المحدد فوق.
            </p>
          </div>

          <div className="bg-card border rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold flex items-center gap-2">
                <MapPin className="size-4.5 text-primary" />
                أسعار الشحن لكل محافظة
              </h2>
              <div className="flex items-center gap-2">
                <input
                  id="bulk-rate"
                  placeholder="سعر موحد للكل"
                  inputMode="decimal"
                  className="h-9 w-36 rounded-lg border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring/30 price-num text-end"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = Number((e.target as HTMLInputElement).value);
                      if (!isNaN(v) && v >= 0) {
                        const all: Record<string, number> = {};
                        for (const g of GOVERNORATES) all[g] = v;
                        setRates(all);
                        toast.success(`اتطبق سعر ${v} ج.م على كل المحافظات — اضغطي حفظ`);
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("bulk-rate") as HTMLInputElement | null;
                    const v = Number(el?.value || NaN);
                    if (isNaN(v) || v < 0) {
                      toast.error("اكتبي سعر صحيح الأول");
                      return;
                    }
                    const all: Record<string, number> = {};
                    for (const g of GOVERNORATES) all[g] = v;
                    setRates(all);
                    toast.success(`اتطبق سعر ${v} ج.م على كل المحافظات — اضغطي حفظ`);
                  }}
                  className="h-9 px-4 rounded-lg border text-xs font-bold hover:bg-accent"
                >
                  تطبيق على الكل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRates({ ...DEFAULT_SHIPPING_RATES });
                    toast.success("رجعت الأسعار الافتراضية — اضغطي حفظ لتطبيقها");
                  }}
                  className="h-9 px-4 rounded-lg border text-xs font-bold text-muted-foreground hover:bg-accent"
                >
                  استرجاع الافتراضي
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {GOVERNORATES.map((g) => (
                <div key={g} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <span className="text-xs font-semibold flex-1 min-w-0 truncate">{g}</span>
                  <input
                    value={String(rates[g] ?? "")}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, "");
                      setRates((r) => ({ ...r, [g]: v === "" ? 0 : Number(v) }));
                    }}
                    inputMode="decimal"
                    aria-label={`سعر الشحن لمحافظة ${g}`}
                    className="h-8 w-20 rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring/30 price-num text-end"
                  />
                  <span className="text-[10px] text-muted-foreground shrink-0">ج.م</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-accent/50 border px-4 py-3 text-[11px] text-muted-foreground leading-relaxed flex gap-2.5">
              <Info className="size-4 shrink-0 text-primary" />
              العميل هيشوف سعر الشحن الخاص بمحافظته جنب اسمها في صفحة إتمام الطلب، والسعر بيتحسب
              نهائيًا في الطلب من هذه الأسعار — مش من أي مصدر تاني.
            </div>
          </div>
        </section>
      )}

      {/* ============ الإشعارات والعروض ============ */}
      {tab === "notify" && (
        <section className="space-y-4">
          {/* ===== إشعارات واتساب ===== */}
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <h2 className="font-bold flex items-center gap-2">
              <Bell className="size-4.5 text-primary" />
              إشعارات واتساب للعملاء
            </h2>

            <div className="rounded-lg bg-accent/50 border px-4 py-3 text-xs leading-relaxed flex gap-2.5">
              <Info className="size-4 shrink-0 text-primary" />
              <div className="text-muted-foreground">
                <p className="font-bold text-primary mb-1">إمتى الرسائل بتتبعت؟</p>
                <ul className="list-disc ps-4 space-y-0.5">
                  <li>أول ما بوسطة تغيّر حالة الشحنة (في الطريق، خرج للتوصيل، تم التوصيل...) — تلقائيًا من الـ Webhook</li>
                  <li>لما تنشئي شحنة جديدة للعميل — بيوصله رقم التتبع ورابطها</li>
                  <li>لما تغيّري حالة أي طلب من لوحة الطلبات (تأكيد، شحن، توصيل، إلغاء)</li>
                </ul>
                <p className="mt-1.5">
                  الرسالة بتتبعت على رقم الموبايل اللي كتبه العميل في الطلب نفسه.
                </p>
              </div>
            </div>

            <Field label="مزود الإرسال">
              <select
                value={settings.wa_provider || "none"}
                onChange={(e) => set("wa_provider", e.target.value)}
                className={`${inputCls} appearance-none`}
              >
                <option value="none">بدون إشعارات واتساب</option>
                <option value="cloud">WhatsApp Cloud API — الرسمي من Meta</option>
                <option value="ultramsg">UltraMsg — بديل سريع وسهل</option>
              </select>
            </Field>

            {settings.wa_provider === "cloud" && (
              <>
                <div className="rounded-lg bg-accent/50 border px-4 py-3 text-xs leading-relaxed">
                  <p className="font-bold text-primary mb-1">خطوات التفعيل — WhatsApp Cloud API:</p>
                  <ol className="list-decimal ps-4 space-y-1 text-muted-foreground">
                    <li>
                      اعملي تطبيق Business على{" "}
                      <a
                        href="https://developers.facebook.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
                      >
                        developers.facebook.com <ExternalLink className="size-3" />
                      </a>{" "}
                      وفعّلي منتج WhatsApp.
                    </li>
                    <li>من WhatsApp → API Setup: انسخي رقم الهاتف (Phone Number ID) و Permanent Access Token.</li>
                    <li>
                      مهم: العميل لازم يكون ضافي رقمك مرة واحدة أو تبعتيله أول رسالة من القوالب (Template) عشان
                      تقدري ترسلي له رسائل عادية بعدها.
                    </li>
                    <li>حطي البيانات هنا واضغطي حفظ، ثم جربي الإرسال من خانة الاختبار تحت.</li>
                  </ol>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Access Token (دائم)">
                    <input
                      value={settings.wa_cloud_token || ""}
                      onChange={(e) => set("wa_cloud_token", e.target.value)}
                      placeholder="EAAG... من API Setup"
                      dir="ltr"
                      type="password"
                      className={`${inputCls} text-end`}
                    />
                  </Field>
                  <Field label="Phone Number ID">
                    <input
                      value={settings.wa_cloud_phone_id || ""}
                      onChange={(e) => set("wa_cloud_phone_id", e.target.value)}
                      placeholder="123456789012345"
                      dir="ltr"
                      inputMode="numeric"
                      className={`${inputCls} text-end`}
                    />
                  </Field>
                </div>
              </>
            )}

            {settings.wa_provider === "ultramsg" && (
              <>
                <div className="rounded-lg bg-accent/50 border px-4 py-3 text-xs leading-relaxed">
                  <p className="font-bold text-primary mb-1">خطوات التفعيل — UltraMsg:</p>
                  <ol className="list-decimal ps-4 space-y-1 text-muted-foreground">
                    <li>
                      اعملي حساب على{" "}
                      <a
                        href="https://ultramsg.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
                      >
                        ultramsg.com <ExternalLink className="size-3" />
                      </a>{" "}
                      واعملي Instance واربطيه برقم واتساب (امسحي كود QR).
                    </li>
                    <li>انسخي رقم الـ Instance (مثال: instance12345) والـ Token من صفحة الحساب.</li>
                    <li>حطيهم هنا واضغطي حفظ، ثم جربي الإرسال من خانة الاختبار تحت.</li>
                  </ol>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Instance ID">
                    <input
                      value={settings.wa_ultramsg_instance || ""}
                      onChange={(e) => set("wa_ultramsg_instance", e.target.value)}
                      placeholder="instance12345"
                      dir="ltr"
                      className={`${inputCls} text-end`}
                    />
                  </Field>
                  <Field label="UltraMsg Token">
                    <input
                      value={settings.wa_ultramsg_token || ""}
                      onChange={(e) => set("wa_ultramsg_token", e.target.value)}
                      placeholder="من لوحة UltraMsg"
                      dir="ltr"
                      type="password"
                      className={`${inputCls} text-end`}
                    />
                  </Field>
                </div>
              </>
            )}

            {/* اختبار الإرسال */}
            <div className="rounded-lg border-2 border-dashed border-primary/25 p-4 space-y-3">
              <p className="text-sm font-bold flex items-center gap-2">
                <Send className="size-4 text-primary" />
                جربي الإرسال على رقمك الأول
              </p>
              <p className="text-xs text-muted-foreground">
                اكتبي رقم موبايلك بصيغة مصرية عادية (01xxxxxxxxx) واضغطي إرسال — لو الرسالة وصلت
                يبقى كل حاجة تمام. لازم تحفظي الإعدادات الأول.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  inputMode="tel"
                  className={`${inputCls} sm:flex-1 text-end`}
                />
                <button
                  type="button"
                  onClick={sendTestWa}
                  disabled={testing || !testPhone.trim()}
                  className="h-11 px-5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  إرسال رسالة تجريبية
                </button>
              </div>
            </div>

            {/* سجل آخر الإشعارات */}
            {waLogs.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold">آخر محاولات الإرسال</p>
                <div className="space-y-1.5">
                  {waLogs.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold">{EVENT_LABEL[l.event] || l.event}</span>
                        <span className="text-muted-foreground"> — طلب </span>
                        <span className="price-num">{l.orderNumber}</span>
                        {l.error && (
                          <span className="text-destructive block truncate" dir="ltr">
                            {l.error}
                          </span>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          l.status === "SENT"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : l.status === "FAILED"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {l.status === "SENT" ? "اتبعت ✅" : l.status === "FAILED" ? "فشل" : "اتخطى"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ===== مؤقت العروض التنازلي ===== */}
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <h2 className="font-bold flex items-center gap-2">
              <Timer className="size-4.5 text-primary" />
              مؤقت العروض التنازلي (صفحة العروض)
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              عدّاد ينازلي بيظهر فوق صفحة العروض بيخلق إحساس بالاستعجال ويزيد المبيعات. لو سبتيه
              فاضي هيشتغل تلقائيًا على نهاية كل يوم — أو حددي تاريخ ووقت نهاية العرض الحالي بنفسك.
            </p>
            <Field label="نهاية العرض (تاريخ ووقت)">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="datetime-local"
                  value={settings.offers_countdown_end || ""}
                  onChange={(e) => set("offers_countdown_end", e.target.value)}
                  className={`${inputCls} sm:flex-1`}
                />
                <button
                  type="button"
                  onClick={() => {
                    set("offers_countdown_end", "");
                    toast.success("هترجع لنهاية اليوم تلقائيًا — اضغطي حفظ");
                  }}
                  className="h-11 px-4 rounded-lg border text-xs font-bold hover:bg-accent flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Trash2 className="size-3.5" />
                  رجوع للتلقائي
                </button>
              </div>
            </Field>
            <div className="flex flex-wrap gap-2">
              {[
                { h: 6, l: "بعد 6 ساعات" },
                { h: 12, l: "بعد 12 ساعة" },
                { h: 48, l: "بعد يومين" },
                { h: 168, l: "بعد أسبوع" },
              ].map((q) => (
                <button
                  key={q.h}
                  type="button"
                  onClick={() => quickCountdown(q.h)}
                  className="h-9 px-3.5 rounded-lg bg-accent/70 border text-xs font-bold hover:bg-accent"
                >
                  {q.l}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ الإعلانات وطرق الدفع ============ */}
      {tab === "announce" && (
        <section className="space-y-4">
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <h2 className="font-bold flex items-center gap-2">
              <Megaphone className="size-4.5 text-primary" />
              شريط الإعلانات العلوي
            </h2>
            <Field label="نص الإعلان (يظهر أعلى كل الصفحات)">
              <input
                value={settings.announcement || ""}
                onChange={(e) => set("announcement", e.target.value)}
                placeholder="شحن مجاني للطلبات فوق 3000 ج.م"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="bg-card border rounded-xl p-5 space-y-4">
            <h2 className="font-bold">طرق الدفع المتاحة للعملاء</h2>
            {[
              { key: "card_payment_enabled", label: "بطاقة بنكية عبر Paymob (دفع إلكتروني)" },
              { key: "cod_enabled", label: "كاش عند الاستلام" },
              { key: "card_on_delivery_enabled", label: "بطاقة عند الاستلام" },
            ].map((m) => (
              <div key={m.key} className="flex items-center justify-between rounded-lg border px-4 py-3">
                <span className="text-sm font-semibold">{m.label}</span>
                <Switch
                  checked={settings[m.key] !== "false"}
                  onCheckedChange={() => toggle(m.key)}
                  aria-label={m.label}
                />
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              ملاحظة: خيار البطاقة عبر Paymob بيظهر للعملاء بس لما تكون مفاتيح بايموب مضافة من
              تبويب &quot;بوابة الدفع&quot;.
            </p>
          </div>
        </section>
      )}

      {/* ============ البريد الإلكتروني (تأكيد الطلبات + السلات المتروكة) ============ */}
      {tab === "email" && (
        <section className="space-y-4">
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <h2 className="font-bold flex items-center gap-2">
              <Mail className="size-4.5 text-primary" />
              مزود البريد الإلكتروني
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              البريد بيستخدم في: تأكيد الطلبات للعملاء، إشعارك بالطلبات الجديدة، ولينك استرجاع
              السلات المتروكة. معندكش دومين؟ اختاري <b>Gmail SMTP</b> — مجاني وبيشتغل فورًا.
            </p>
            {/* مؤشر الجاهزية — بيقول بالظبط إيه الناقص عشان البريد يشتغل */}
            {(() => {
              const missing: string[] = [];
              const provider = settings.email_provider || "none";
              if (provider === "none") missing.push("اختيار المزود");
              if (provider === "resend") {
                if (!settings.email_resend_key) missing.push("مفتاح Resend API");
                if (!settings.email_from) missing.push('بريد المُرسل (from)');
              }
              if (provider === "smtp") {
                if (!settings.email_smtp_host) missing.push("سيرفر SMTP");
                if (!settings.email_smtp_user) missing.push("اسم المستخدم");
                if (!settings.email_smtp_pass) missing.push("كلمة المرور");
                if (!settings.email_from) missing.push("بريد المُرسل (from)");
              }
              if (missing.length === 0) {
                return (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="size-4 shrink-0" />
                    الإعدادات مكتملة — البريد جاهز للإرسال ✨ (جرّبي الزر «إرسال إيميل تجريبي» تحت)
                  </div>
                );
              }
              return (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                  <XCircle className="size-4 mt-0.5 shrink-0" />
                  <span>
                    ناقص عشان البريد يشتغل: <b>{missing.join("، ")}</b> — كمّلي البيانات دي وبعدين
                    اضغطي «حفظ كل الإعدادات» تحت.
                  </span>
                </div>
              );
            })()}
            <Field label="المزود">
              <select
                value={settings.email_provider || "none"}
                onChange={(e) => set("email_provider", e.target.value)}
                className={inputCls}
              >
                <option value="none">مُعطّل — بدون بريد</option>
                <option value="smtp">Gmail SMTP — مجاني ومن غير دومين (مُوصى به)</option>
                <option value="resend">Resend API — محتاج دومين خاص مفعّل</option>
              </select>
            </Field>

            {(settings.email_provider || "none") === "resend" && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 leading-relaxed">
                ⚠️ خدي بالك: Resend من غير دومين خاص مفعّل بيبعت لإيميل حسابك في Resend بس —
                مش هيوصل لكل العملاء. لو معندكيش دومين، الأفضل ترجعي لـ <b>Gmail SMTP</b> —
                مجاني وبيبعت لأي عميل فورًا من غير أي دومين.
              </div>
            )}

            {(settings.email_provider || "none") === "resend" && (
              <div className="space-y-3 rounded-lg bg-accent/40 p-4">
                <Field label="مفتاح API من Resend">
                  <input
                    value={settings.email_resend_key || ""}
                    onChange={(e) => set("email_resend_key", e.target.value)}
                    placeholder="re_..."
                    dir="ltr"
                    type="password"
                    className={`${inputCls} text-end`}
                  />
                </Field>
                <a
                  href="https://resend.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  اعملي مفتاح من resend.com
                  <ExternalLink className="size-3" />
                </a>
              </div>
            )}

            {(settings.email_provider || "none") === "smtp" && (
              <div className="space-y-3 rounded-lg bg-accent/40 p-4">
                {/* دليل جيميل السريع — مجاني ومن غير دومين */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-2">
                  <p className="text-sm font-bold text-blue-900">📧 إعداد Gmail — 3 خطوات بس (مجاني وبدون دومين)</p>
                  <ol className="text-xs text-blue-800 leading-relaxed list-decimal pr-4 space-y-1">
                    <li>
                      فعّلي التحقق بخطوتين في حساب جوجل:{" "}
                      <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="underline font-semibold inline-flex items-center gap-0.5">
                        myaccount.google.com/security
                        <ExternalLink className="size-3" />
                      </a>
                    </li>
                    <li>
                      اعملي «كلمة مرور التطبيقات» من{" "}
                      <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-semibold inline-flex items-center gap-0.5">
                        myaccount.google.com/apppasswords
                        <ExternalLink className="size-3" />
                      </a>{" "}
                      — هيطلع لك 16 حرف، انسخيهم
                    </li>
                    <li>اكتبي إيميل الجيميل في «اسم المستخدم» والـ 16 حرف في «كلمة المرور» — وبريد المُرسل تحت اكتبي نفس إيميل الجيميل</li>
                  </ol>
                  <button
                    type="button"
                    onClick={() => {
                      set("email_smtp_host", "smtp.gmail.com");
                      set("email_smtp_port", "587");
                      set("email_smtp_secure", "false");
                      toast.success("اتظبط سيرفر جيميل تلقائيًا — كمّلي المستخدم وكلمة المرور واضغطي حفظ");
                    }}
                    className="text-xs font-bold text-blue-700 hover:underline"
                  >
                    ⚡ تعبئة سيرفر جيميل تلقائيًا (smtp.gmail.com — منفذ 587)
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="سيرفر SMTP">
                    <input
                      value={settings.email_smtp_host || ""}
                      onChange={(e) => set("email_smtp_host", e.target.value)}
                      placeholder="smtp.gmail.com"
                      dir="ltr"
                      className={`${inputCls} text-end`}
                    />
                  </Field>
                  <Field label="المنفذ (Port)">
                    <input
                      value={settings.email_smtp_port || "587"}
                      onChange={(e) => set("email_smtp_port", e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="587"
                      dir="ltr"
                      className={`${inputCls} text-end`}
                    />
                  </Field>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="اسم المستخدم">
                    <input
                      value={settings.email_smtp_user || ""}
                      onChange={(e) => set("email_smtp_user", e.target.value)}
                      placeholder="mystore@gmail.com"
                      dir="ltr"
                      className={`${inputCls} text-end`}
                    />
                  </Field>
                  <Field label="كلمة المرور (App Password لجيميل)">
                    <input
                      value={settings.email_smtp_pass || ""}
                      onChange={(e) => set("email_smtp_pass", e.target.value)}
                      type="password"
                      dir="ltr"
                      className={`${inputCls} text-end`}
                    />
                  </Field>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
                  <span className="text-sm font-semibold">اتصال آمن SSL (لو المنفذ 465)</span>
                  <Switch
                    checked={settings.email_smtp_secure === "true"}
                    onCheckedChange={() => toggle("email_smtp_secure")}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  لجيميل: لازم «App Password» — كلمة السر العادية مش هتشتغل. الحد 500 إيميل/يوم
                  (كفاية جدًا للمتجر). بديل مجاني تاني: <b>Brevo</b> — 300 رسالة/يوم، سيرفر
                  <span dir="ltr"> smtp-relay.brevo.com </span> منفذ 587.
                </p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="اسم المُرسل (يظهر للعميل)">
                <input
                  value={settings.email_from_name || ""}
                  onChange={(e) => set("email_from_name", e.target.value)}
                  placeholder="متجر الواحة"
                  className={inputCls}
                />
              </Field>
              <Field label="بريد المُرسل (from)">
                <input
                  value={settings.email_from || ""}
                  onChange={(e) => set("email_from", e.target.value)}
                  placeholder="onboarding@resend.dev"
                  dir="ltr"
                  type="email"
                  className={`${inputCls} text-end`}
                />
              </Field>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-1">
              لو لسه مفعّلتish دومين خاص في Resend، اكتبي <b dir="ltr">onboarding@resend.dev</b>.
              في الحالة دي Resend بيسمح بالإرسال لإيميل حسابك في Resend بس — لحد ما تضيفي دومين
              وتفعّليه من لوحة Resend.
            </p>

            <Field label="كوبون استرجاع السلة (اختياري)">
              <input
                value={settings.email_recovery_coupon || ""}
                onChange={(e) => set("email_recovery_coupon", e.target.value.toUpperCase())}
                placeholder="مثال: COMEBACK10 — يظهر في إيميل استرجاع السلة كخصم إضافي"
                dir="ltr"
                className={`${inputCls} text-end`}
              />
            </Field>
            <p className="text-[11px] text-muted-foreground">
              لو كتبتي كود هنا، هيظهر للعميل في إيميل السلة المتروكة. اعملي نفس الكود في تبويب
              &quot;أكواد الخصم&quot; الأول عشان يشتغل فعلًا.
            </p>
          </div>

          {/* اختبار الإرسال */}
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <p className="text-sm font-bold flex items-center gap-1.5">
              <Send className="size-4 text-primary" />
              جرّبي الإرسال على بريدك الأول
            </p>
            <p className="text-xs text-muted-foreground">
              اكتبي أي بريد واضغطي إرسال (احفظي الإعدادات الأول). ⚠️ مهم: إيميلات جيميل الجديدة بتوصل
              صندوق الوارد عندك أنتِ فورًا، لكن لما تبعتيلي حد تاني ممكن توصل عندُ في مجلد
              <b> «Spam / الرسائل غير المرغوبة» </b> — خليه يفتحها ويضغط «مش سبام» مرة واحدة، وبعدها كل إيميلاتك هتوصله عادي.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@mail.com"
                dir="ltr"
                type="email"
                className={`${inputCls} sm:flex-1 text-end`}
              />
              <button
                type="button"
                onClick={sendTestEmail}
                disabled={testingEmail || !testEmail.trim()}
                className="h-11 px-5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                {testingEmail ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                إرسال إيميل تجريبي
              </button>
            </div>
          </div>
        </section>
      )}

      <Separator />

      <button
        onClick={save}
        disabled={saving}
        className="w-full sm:w-auto h-11 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        حفظ كل الإعدادات
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}
