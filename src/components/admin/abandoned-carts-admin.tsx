"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Mail,
  MailWarning,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Send,
  MessageCircle,
  RefreshCcw,
  ExternalLink,
  Inbox,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatEGP, navigate } from "@/lib/shop-utils";
import { toast } from "sonner";
import type { AbandonedCartInfo } from "@/lib/types";

interface EmailLogRow {
  id: string;
  to: string;
  subject: string;
  template: string;
  status: string;
  error: string | null;
  createdAt: string;
}

interface Payload {
  success: boolean;
  carts: AbandonedCartInfo[];
  counts: { open: number; recovered: number; expired: number };
  recentEmails: EmailLogRow[];
  channels: { emailReady: boolean; whatsappReady: boolean; emailProvider: string };
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "مفتوحة", cls: "bg-amber-100 text-amber-800" },
  RECOVERED: { label: "تم الاسترجاع", cls: "bg-emerald-100 text-emerald-700" },
  EXPIRED: { label: "انتهت", cls: "bg-gray-100 text-gray-600" },
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export function AbandonedCartsAdmin() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AbandonedCartInfo | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/abandoned-carts?status=${filter}`);
      const json = await res.json();
      if (json.success) setData(json);
      else toast.error(json.error || "خطأ في تحميل السلات");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  // إرسال لينك الإكمال بضغطة — إيميل أو واتساب
  const send = async (cart: AbandonedCartInfo, channel: "EMAIL" | "WHATSAPP") => {
    setSendingId(cart.id + channel);
    try {
      const res = await fetch(`/api/admin/abandoned-carts/${cart.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          channel === "EMAIL"
            ? (json.message || "تم الإرسال") + " — لو العميل مش لاقي الإيميل خليه يشوف مجلد Spam ويضغط «مش سبام»"
            : (json.message || "تم الإرسال"),
          { duration: 6000 }
        );
        // واتساب بدون مزود مفعّل → افتح المحادثة بالرسالة الجاهزة
        if (channel === "WHATSAPP" && json.manualUrl && !json.viaProvider) {
          window.open(json.manualUrl, "_blank");
        }
        load();
      } else {
        toast.error(json.error || "فشل الإرسال");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setSendingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const res = await fetch(`/api/admin/abandoned-carts/${deleting.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("تم حذف السلة");
      load();
    } else {
      toast.error(json.error || "حدث خطأ");
    }
    setDeleting(null);
  };

  const counts = data?.counts || { open: 0, recovered: 0, expired: 0 };
  const total = counts.open + counts.recovered + counts.expired;
  const rate = total > 0 ? Math.round((counts.recovered / total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">السلات المتروكة</h1>
          <p className="text-sm text-muted-foreground mt-1">
            عملاء سابوا سلاتهم — ابعتلهم لينك إكمال الطلب بضغطة واحدة
          </p>
        </div>
        <button
          onClick={load}
          className="h-10 px-4 rounded-xl border text-sm font-bold hover:bg-accent transition flex items-center gap-2 self-start"
        >
          <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {/* تنبيه جاهزية البريد */}
      {data && !data.channels.emailReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <MailWarning className="size-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 flex-1 leading-relaxed">
            البريد الإلكتروني غير مفعّل بعد — فعّليه من الإعدادات عشان يتبعت لينك الإكمال للعملاء أوتوماتيك.
            (ممكن كمان تبعتي الرسالة يدويًا بالواتساب من هنا).
          </p>
          <button
            onClick={() => navigate("/admin/settings")}
            className="h-9 px-4 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition shrink-0"
          >
            إعدادات البريد
          </button>
        </div>
      )}

      {/* إحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "سلات مفتوحة", value: counts.open, icon: Clock, cls: "text-amber-600 bg-amber-50" },
          { label: "تم استرجاعها", value: counts.recovered, icon: CheckCircle2, cls: "text-emerald-700 bg-emerald-50" },
          { label: "انتهت صلاحيتها", value: counts.expired, icon: Inbox, cls: "text-gray-500 bg-gray-50" },
          { label: "نسبة الاسترجاع", value: `${rate}%`, icon: ShoppingCart, cls: "text-primary bg-primary/10" },
        ].map((s) => (
          <div key={s.label} className="bg-card border rounded-xl p-4">
            <span className={`inline-flex size-9 rounded-lg items-center justify-center ${s.cls}`}>
              <s.icon className="size-4.5" />
            </span>
            <p className="price-num text-2xl font-bold mt-2.5">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* فلتر الحالة */}
      <div className="flex gap-1.5 overflow-x-auto">
        {[
          { key: "ALL", label: "الكل" },
          { key: "OPEN", label: "مفتوحة" },
          { key: "RECOVERED", label: "تم استرجاعها" },
          { key: "EXPIRED", label: "انتهت" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`h-9 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-accent/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* قائمة السلات */}
      <div className="space-y-3">
        {loading && !data ? (
          <div className="flex items-center justify-center py-20 bg-card border rounded-xl">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
        ) : !data || data.carts.length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-xl">
            <ShoppingCart className="size-10 text-muted-foreground/30 mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              لا توجد سلات متروكة {filter !== "ALL" ? "بهذه الحالة" : "حاليًا"} — أول ما عميل يسيب سلة فيه بيانات تواصل هتظهر هنا
            </p>
          </div>
        ) : (
          data.carts.map((cart) => {
            const items = (cart.items as unknown as { name: string; image: string; quantity: number; price: number; size?: string | null; color?: string | null }[]) || [];
            const st = STATUS_LABEL[cart.status] || STATUS_LABEL.OPEN;
            const isOpen = expanded === cart.id;
            return (
              <div key={cart.id} className="bg-card border rounded-xl overflow-hidden">
                <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                  {/* العميل */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm">{cart.customerName || "زائر"}</p>
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                      {cart.remindersSent > 0 && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                          اتبعتت {cart.remindersSent} {cart.remindersSent === 1 ? "تذكيرة" : "تذكيرات"}
                          {cart.lastChannel ? ` (${cart.lastChannel === "EMAIL" ? "إيميل" : "واتساب"})` : ""}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap" dir="auto">
                      {cart.phone && <span dir="ltr">📱 {cart.phone}</span>}
                      {cart.email && <span dir="ltr">✉️ {cart.email}</span>}
                      {cart.city && <span>📍 {cart.city}</span>}
                      <span>{timeAgo(cart.updatedAt)}</span>
                    </div>
                  </div>

                  {/* الملخص */}
                  <div className="text-sm shrink-0">
                    <span className="price-num font-bold text-primary">{formatEGP(cart.subtotal)}</span>
                    <span className="text-xs text-muted-foreground"> — {items.length} منتج</span>
                  </div>

                  {/* أزرار الإرسال */}
                  {cart.status === "OPEN" && (
                    <div className="flex gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => send(cart, "EMAIL")}
                        disabled={sendingId === cart.id + "EMAIL"}
                        title={cart.email ? "إرسال لينك الإكمال بالإيميل" : "العميل مكتوبش إيميل"}
                        className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {sendingId === cart.id + "EMAIL" ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                        إيميل
                      </button>
                      <button
                        onClick={() => send(cart, "WHATSAPP")}
                        disabled={sendingId === cart.id + "WHATSAPP"}
                        title={cart.phone ? "إرسال لينك الإكمال واتساب" : "العميل مكتوبش رقم"}
                        className="h-9 px-3.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {sendingId === cart.id + "WHATSAPP" ? <Loader2 className="size-3.5 animate-spin" /> : <MessageCircle className="size-3.5" />}
                        واتساب
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setExpanded(isOpen ? null : cart.id)}
                    className="h-9 px-3 rounded-lg border text-xs font-semibold text-muted-foreground hover:text-foreground transition shrink-0"
                  >
                    {isOpen ? "إخفاء المنتجات" : "المنتجات"}
                  </button>
                  <button
                    onClick={() => setDeleting(cart)}
                    className="size-9 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive transition shrink-0"
                    aria-label="حذف السلة"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {/* المنتجات */}
                {isOpen && (
                  <div className="border-t bg-accent/20 p-4 grid sm:grid-cols-2 gap-2">
                    {items.map((i, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 bg-background rounded-lg p-2 border">
                        <img src={i.image} alt={i.name} className="size-10 rounded-md object-cover border shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold line-clamp-1">{i.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {[i.quantity + " قطعة", i.size && `مقاس ${i.size}`, i.color].filter(Boolean).join(" — ")}
                          </p>
                        </div>
                        <span className="price-num text-xs font-bold shrink-0">{formatEGP(i.price * i.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* آخر الإيميلات المرسلة */}
      {data && data.recentEmails.length > 0 && (
        <div className="bg-card border rounded-xl p-4">
          <p className="font-bold text-sm mb-3 flex items-center gap-1.5">
            <Send className="size-4 text-primary" />
            آخر الإيميلات المرسلة
          </p>
          <div className="space-y-1.5">
            {data.recentEmails.slice(0, 8).map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-xs py-1.5 border-b last:border-0">
                <span
                  className={`size-2 rounded-full shrink-0 ${
                    e.status === "SENT" ? "bg-emerald-500" : e.status === "FAILED" ? "bg-destructive" : "bg-gray-300"
                  }`}
                  title={e.status}
                />
                <span className="font-semibold shrink-0" dir="ltr">{e.to}</span>
                <span className="text-muted-foreground line-clamp-1 flex-1">{e.subject}</span>
                <span className="text-muted-foreground shrink-0 hidden sm:inline">{timeAgo(e.createdAt)}</span>
                {e.status === "FAILED" && e.error && (
                  <span className="text-destructive shrink-0" title={e.error}>⚠</span>
                )}
              </div>
            ))}
          </div>
          <a
            href="#/admin/settings"
            className="mt-2 text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            إعدادات البريد
            <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      {/* تأكيد الحذف */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف السلة المتروكة</DialogTitle>
            <DialogDescription>
              هل تريدين حذف سلة "{deleting?.customerName || "الزائر"}" ({deleting ? formatEGP(deleting.subtotal) : ""})؟
              لن يتمكن العميل من استرجاعها من لينك قديم.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <button
              onClick={confirmDelete}
              className="flex-1 h-10 rounded-xl bg-destructive text-white font-bold text-sm hover:bg-destructive/90"
            >
              نعم، احذفي
            </button>
            <button
              onClick={() => setDeleting(null)}
              className="flex-1 h-10 rounded-xl border font-semibold text-sm hover:bg-accent"
            >
              إلغاء
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
