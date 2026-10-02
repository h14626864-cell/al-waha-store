"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  MapPin,
  Phone,
  StickyNote,
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatEGP, formatDate } from "@/lib/shop-utils";
import { ORDER_STATUS, PAYMENT_METHODS, type Order } from "@/lib/types";
import { StatusBadge } from "./dashboard";
import { toast } from "sonner";

const STATUSES = ["ALL", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

export function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/orders?status=${statusFilter}`);
    const data = await res.json();
    if (data.success) setOrders(data.orders);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (order: Order, status: string) => {
    setUpdating(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `تم تحديث حالة الطلب إلى "${ORDER_STATUS[status]?.label || status}"`
        );
        load();
      } else {
        toast.error(data.error || "حدث خطأ");
      }
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">الطلبات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة ومتابعة طلبات العملاء
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-10" aria-label="تصفية بالحالة">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "كل الطلبات" : ORDER_STATUS[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-card border rounded-xl text-center py-16">
          <p className="font-bold">لا توجد طلبات</p>
          <p className="text-sm text-muted-foreground mt-1.5">
            الطلبات الجديدة ستظهر هنا فور وصولها
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-card border rounded-xl overflow-hidden">
              {/* رأس الطلب */}
              <button
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition text-start"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="price-num font-bold text-primary" dir="ltr">
                      {order.orderNumber}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm mt-1.5">
                    {order.customerName} —{" "}
                    <span className="price-num text-muted-foreground">
                      {order.items.length} منتج
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="text-end shrink-0">
                  <p className="price-num font-bold text-lg">{formatEGP(order.total)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {PAYMENT_METHODS[order.paymentMethod] || order.paymentMethod}
                  </p>
                </div>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                    expanded === order.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* تفاصيل الطلب */}
              {expanded === order.id && (
                <div className="border-t bg-accent/20 p-4 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-lg bg-card border p-3.5 text-sm space-y-2">
                      <p className="flex items-start gap-2">
                        <MapPin className="size-4 shrink-0 text-primary mt-0.5" />
                        <span>
                          {order.customerName}
                          <br />
                          <span className="text-muted-foreground">
                            {order.city} — {order.address}
                          </span>
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="size-4 shrink-0 text-primary" />
                        <span className="price-num" dir="ltr">
                          {order.phone}
                        </span>
                      </p>
                      {order.notes && (
                        <p className="flex items-start gap-2">
                          <StickyNote className="size-4 shrink-0 text-primary mt-0.5" />
                          <span className="text-muted-foreground">{order.notes}</span>
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg bg-card border p-3.5 space-y-2">
                      <p className="text-xs text-muted-foreground font-semibold">تحديث الحالة:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(order, s)}
                            disabled={updating === order.id || order.status === s}
                            className={`h-8 px-3 rounded-lg text-xs font-bold transition disabled:cursor-default ${
                              order.status === s
                                ? "bg-primary text-primary-foreground"
                                : "border hover:bg-accent text-muted-foreground"
                            }`}
                          >
                            {ORDER_STATUS[s].label}
                          </button>
                        ))}
                      </div>
                      {order.couponCode && (
                        <p className="text-xs text-emerald-700 font-semibold">
                          كود مستخدم: {order.couponCode} (وفّر {formatEGP(order.discount)})
                        </p>
                      )}
                    </div>
                  </div>

                  {/* عناصر الطلب */}
                  <div className="rounded-lg bg-card border divide-y">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3">
                        <img
                          src={item.image || ""}
                          alt={item.productName}
                          className="size-10 rounded-lg object-cover border shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold line-clamp-1">{item.productName}</p>
                          {(item.size || item.color) && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {[item.size && `مقاس ${item.size}`, item.color].filter(Boolean).join(" — ")}
                            </p>
                          )}
                          <p className="price-num text-xs text-muted-foreground">
                            {item.quantity} × {formatEGP(item.price)}
                          </p>
                        </div>
                        <span className="price-num text-sm font-bold">
                          {formatEGP(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                    <div className="p-3 text-sm space-y-1.5 bg-accent/30">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المجموع الفرعي</span>
                        <span className="price-num">{formatEGP(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الشحن</span>
                        <span className="price-num">
                          {order.shipping === 0 ? "مجاني" : formatEGP(order.shipping)}
                        </span>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between text-emerald-700">
                          <span>الخصم</span>
                          <span className="price-num">-{formatEGP(order.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold pt-1.5 border-t">
                        <span>الإجمالي</span>
                        <span className="price-num text-primary">{formatEGP(order.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
