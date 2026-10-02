"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LifeBuoy,
  Send,
  Loader2,
  MessageSquarePlus,
  Phone,
  Mail,
  Clock,
  MessageCircle,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomer } from "@/lib/store";
import { formatDate, navigate } from "@/lib/shop-utils";
import { TICKET_STATUS, type Ticket } from "@/lib/types";
import { toast } from "sonner";

// صفحة الدعم: إنشاء تذكرة + متابعة التذاكر والمحادثة
export function SupportView({ openTicketNumber }: { openTicketNumber?: string }) {
  const { customer, loading: authLoading } = useCustomer();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [creating, setCreating] = useState(false);
  const [replyText, setReplyText] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    orderNumber: "",
    message: "",
  });
  const [formError, setFormError] = useState("");

  // تعبئة البيانات من حساب العميل
  useEffect(() => {
    if (customer) {
      setForm((f) => ({ ...f, name: f.name || customer.name, email: f.email || "" }));
    }
  }, [customer]);

  const loadTickets = useCallback(async () => {
    if (!customer) return;
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/support/tickets");
      if (res.ok) {
        const data = await res.json();
        if (data.success) setTickets(data.tickets);
      }
    } finally {
      setLoadingTickets(false);
    }
  }, [customer]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadTicket = useCallback(async (num: string) => {
    const res = await fetch(`/api/support/tickets/${encodeURIComponent(num)}`);
    const data = await res.json();
    if (data.success) setActiveTicket(data.ticket);
    else toast.error(data.error || "التذكرة غير موجودة");
  }, []);

  // فتح تذكرة بالرقم من الرابط
  useEffect(() => {
    if (openTicketNumber) loadTicket(openTicketNumber);
  }, [openTicketNumber, loadTicket]);

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setCreating(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`تم إنشاء تذكرتك برقم ${data.ticket.ticketNumber}`);
        setForm({ name: form.name, email: form.email, subject: "", orderNumber: "", message: "" });
        await loadTicket(data.ticket.ticketNumber);
        loadTickets();
      } else {
        setFormError(data.error || "حدث خطأ");
      }
    } catch {
      setFormError("حدث خطأ في الاتصال");
    } finally {
      setCreating(false);
    }
  };

  const sendReply = async () => {
    if (!activeTicket || !replyText.trim()) return;
    const text = replyText.trim();
    setReplyText("");
    const res = await fetch(`/api/support/tickets/${activeTicket.ticketNumber}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    if (data.success) {
      await loadTicket(activeTicket.ticketNumber);
      loadTickets();
    } else {
      toast.error(data.error || "فشل إرسال الرد");
      setReplyText(text);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* الترويسة */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
          <LifeBuoy className="size-7 text-primary" />
          الدعم الفني
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
          عندك مشكلة في طلب أو استفسار؟ افتح تذكرة وهنرد عليك بأسرع وقت — أو تواصل معنا مباشرة
        </p>
      </div>

      {/* قنوات التواصل المباشر */}
      <div className="grid sm:grid-cols-3 gap-3">
        <ContactCard
          icon={Phone}
          title="الهاتف"
          value="19999"
          desc="يوميًا 9 ص — 11 م"
        />
        <ContactCard
          icon={Mail}
          title="البريد الإلكتروني"
          value="support@alwaha-store.com"
          desc="نرد خلال 24 ساعة"
          ltr
        />
        <ContactCard
          icon={Clock}
          title="وقت الاستجابة"
          value="أقل من ساعتين"
          desc="متوسط وقت أول رد"
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* فتح تذكرة جديدة */}
        <div className="bg-card border rounded-2xl p-5 sm:p-6">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <MessageSquarePlus className="size-5 text-primary" />
            افتح تذكرة جديدة
          </h2>
          <form onSubmit={submitTicket} className="mt-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">الاسم *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="اسمك"
                  className={supportInput}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">البريد الإلكتروني *</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="example@mail.com"
                  type="email"
                  dir="ltr"
                  className={`${supportInput} text-end`}
                  required
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">الموضوع *</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="مثال: استفسار عن حالة طلب"
                  className={supportInput}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">رقم الطلب (اختياري)</label>
                <input
                  value={form.orderNumber}
                  onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))}
                  placeholder="WH-XXXXXXXX-XXXX"
                  dir="ltr"
                  className={`${supportInput} text-end`}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">رسالتك *</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="اشرح مشكلتك أو استفسارك بالتفصيل..."
                rows={4}
                className={`${supportInput} resize-none`}
                required
              />
            </div>

            {formError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3.5 py-2.5 font-medium">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : "إرسال التذكرة"}
            </button>
          </form>
        </div>

        {/* متابعة تذكرة / تذاكر العميل */}
        <div className="space-y-4">
          {activeTicket && (
            <div className="bg-card border rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-sm" dir="ltr">
                    {activeTicket.ticketNumber}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {activeTicket.subject}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    (TICKET_STATUS[activeTicket.status] || TICKET_STATUS.OPEN).color
                  }`}
                >
                  {(TICKET_STATUS[activeTicket.status] || TICKET_STATUS.OPEN).label}
                </span>
              </div>

              <Separator className="my-4" />

              {/* المحادثة */}
              <div className="space-y-3 max-h-72 overflow-y-auto pe-1">
                {activeTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "ADMIN" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                        msg.sender === "ADMIN"
                          ? "bg-accent/70 rounded-tr-sm"
                          : "bg-primary text-primary-foreground rounded-tl-sm"
                      }`}
                    >
                      <p className="text-[10px] font-bold mb-1 opacity-70">
                        {msg.sender === "ADMIN" ? "فريق الدعم" : "أنت"}
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      <p className="text-[10px] opacity-60 mt-1">{formatDate(msg.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* الرد */}
              {activeTicket.status !== "CLOSED" && (
                <div className="mt-4 flex gap-2">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendReply())}
                    placeholder="اكتب ردك..."
                    className="flex-1 h-10 rounded-lg border bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!replyText.trim()}
                    className="size-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50"
                    aria-label="إرسال الرد"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* تذاكر العميل المسجل */}
          {customer && !authLoading && (
            <div className="bg-card border rounded-2xl p-5">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <MessageCircle className="size-4 text-primary" />
                تذاكري ({tickets.length})
              </h3>
              {loadingTickets ? (
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-12 rounded-lg" />
                  <Skeleton className="h-12 rounded-lg" />
                </div>
              ) : tickets.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-3">
                  لا توجد تذاكر — تذاكرك السابقة هتظهر هنا
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {tickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => loadTicket(t.ticketNumber)}
                      className={`w-full text-start rounded-lg border px-3.5 py-2.5 hover:border-ring/50 transition ${
                        activeTicket?.id === t.id ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold" dir="ltr">
                          {t.ticketNumber}
                        </p>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            (TICKET_STATUS[t.status] || TICKET_STATUS.OPEN).color
                          }`}
                        >
                          {(TICKET_STATUS[t.status] || TICKET_STATUS.OPEN).label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.subject}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* متابعة تذكرة بالرقم للزوار */}
          {!customer && !authLoading && (
            <div className="bg-accent/40 border rounded-2xl p-5">
              <p className="text-sm font-bold">تابع تذكرتك بالرقم</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                احفظ رقم التذكرة (TK-...) وادخل به في أي وقت لمتابعة الردود، أو{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="text-primary font-bold hover:underline"
                >
                  سجّل الدخول
                </button>{" "}
                لعرض كل تذاكرك.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const supportInput =
  "w-full h-11 rounded-lg border bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition placeholder:text-muted-foreground";

function ContactCard({
  icon: Icon,
  title,
  value,
  desc,
  ltr,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  desc: string;
  ltr?: boolean;
}) {
  return (
    <div className="bg-card border rounded-xl p-4 text-center">
      <span className="inline-flex size-10 rounded-lg bg-primary/10 text-primary items-center justify-center">
        <Icon className="size-5" />
      </span>
      <p className="text-xs text-muted-foreground mt-2.5">{title}</p>
      <p
        className="text-sm font-bold mt-0.5 break-all"
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
