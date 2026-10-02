"use client";

import { useCallback, useEffect, useState } from "react";
import { LifeBuoy, Send, Loader2, Mail, Phone, ShoppingBag } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatDate, navigate } from "@/lib/shop-utils";
import { TICKET_STATUS, type Ticket } from "@/lib/types";
import { toast } from "sonner";

// إدارة تذاكر الدعم من لوحة التحكم
export function SupportAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tickets");
      const data = await res.json();
      if (data.success) setTickets(data.tickets);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openTicket = (t: Ticket) => setActive(t);

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/tickets/${active.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: reply.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setActive(data.ticket);
        setReply("");
        toast.success("تم إرسال الرد للعميل");
        load();
      } else {
        toast.error(data.error || "فشل الإرسال");
      }
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (ticketId: string, status: string) => {
    const res = await fetch(`/api/admin/tickets/${ticketId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) {
      setActive(data.ticket);
      load();
      toast.success("تم تحديث حالة التذكرة");
    }
  };

  const openCount = tickets.filter((t) => t.status === "OPEN").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <LifeBuoy className="size-5 text-primary" />
          الدعم الفني
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {openCount > 0 ? (
            <span className="text-amber-700 font-bold">{openCount} تذكرة تنتظر ردك</span>
          ) : (
            "كل التذاكر تم الرد عليها 👌"
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-5 items-start">
        {/* قائمة التذاكر */}
        <div className="bg-card border rounded-xl p-3 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">جاري التحميل...</div>
          ) : tickets.length === 0 ? (
            <div className="py-12 text-center">
              <LifeBuoy className="size-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-bold mt-3">لا توجد تذاكر</p>
              <p className="text-xs text-muted-foreground mt-1">تذاكر العملاء هتظهر هنا</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTicket(t)}
                  className={`w-full text-start rounded-lg border px-3.5 py-3 hover:border-ring/50 transition ${
                    active?.id === t.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold price-num" dir="ltr">
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
                  <p className="text-sm font-semibold mt-1 line-clamp-1">{t.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.name} — {formatDate(t.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* تفاصيل التذكرة */}
        {active ? (
          <div className="bg-card border rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">{active.subject}</h2>
                <p className="text-xs text-muted-foreground mt-1 price-num" dir="ltr">
                  {active.ticketNumber}
                </p>
              </div>
              <div className="flex gap-2">
                {active.status !== "CLOSED" ? (
                  <button
                    onClick={() => setStatus(active.id, "CLOSED")}
                    className="h-9 px-4 rounded-lg border text-xs font-bold hover:bg-accent"
                  >
                    إغلاق التذكرة
                  </button>
                ) : (
                  <button
                    onClick={() => setStatus(active.id, "OPEN")}
                    className="h-9 px-4 rounded-lg border text-xs font-bold hover:bg-accent"
                  >
                    إعادة فتح
                  </button>
                )}
              </div>
            </div>

            {/* بيانات العميل */}
            <div className="mt-4 grid sm:grid-cols-3 gap-2.5">
              <InfoChip icon={Mail} label={active.email} ltr />
              {active.orderNumber && (
                <button
                  onClick={() => navigate(`/order/${active.orderNumber}`)}
                  className="flex items-center gap-2 rounded-lg bg-accent/60 px-3 py-2 text-xs"
                >
                  <ShoppingBag className="size-3.5 shrink-0" />
                  <span className="price-num font-bold" dir="ltr">
                    {active.orderNumber}
                  </span>
                </button>
              )}
            </div>

            <Separator className="my-4" />

            {/* المحادثة */}
            <div className="space-y-3 max-h-80 overflow-y-auto pe-1">
              {active.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "ADMIN" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${
                      msg.sender === "ADMIN"
                        ? "bg-primary text-primary-foreground rounded-tl-sm"
                        : "bg-accent/70 rounded-tr-sm"
                    }`}
                  >
                    <p className="text-[10px] font-bold mb-1 opacity-70">
                      {msg.sender === "ADMIN" ? "فريق الدعم (أنت)" : active.name}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                    <p className="text-[10px] opacity-60 mt-1">{formatDate(msg.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* الرد */}
            {active.status !== "CLOSED" && (
              <div className="mt-4 flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendReply())}
                  placeholder="اكتب ردك للعميل..."
                  className="flex-1 h-11 rounded-lg border bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="h-11 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  رد
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card border rounded-xl p-12 text-center">
            <LifeBuoy className="size-12 text-muted-foreground/30 mx-auto" />
            <p className="mt-3 font-bold text-muted-foreground">اختار تذكرة لعرض المحادثة</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
  ltr,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-accent/60 px-3 py-2 text-xs">
      <Icon className="size-3.5 shrink-0" />
      <span className="font-semibold truncate" dir={ltr ? "ltr" : undefined}>
        {label}
      </span>
    </div>
  );
}
