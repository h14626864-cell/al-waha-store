"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Package,
  LogOut,
  User,
  Loader2,
  ChevronLeft,
  Eye,
  Search,
  LifeBuoy,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomer } from "@/lib/store";
import { formatEGP, formatDate, navigate } from "@/lib/shop-utils";
import { ORDER_STATUS, type Order } from "@/lib/types";
import { toast } from "sonner";

// صفحة حساب العميل: بياناته + طلباته + حالتها
export function AccountView() {
  const { customer, loading: authLoading, logout } = useCustomer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/orders");
      if (res.ok) {
        const data = await res.json();
        if (data.success) setOrders(data.orders);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && customer) loadOrders();
    else if (!authLoading && !customer) setLoading(false);
  }, [authLoading, customer, loadOrders]);

  const handleLogout = async () => {
    await logout();
    toast.success("تم تسجيل الخروج");
    navigate("/");
  };

  if (authLoading) {
    return <div className="py-24 text-center text-muted-foreground">جاري التحميل...</div>;
  }

  if (!customer) {
    return (
      <div className="max-w-md mx-auto py-10 text-center bg-card border rounded-2xl p-8">
        <span className="inline-flex size-16 rounded-full bg-accent items-center justify-center">
          <User className="size-8 text-muted-foreground" />
        </span>
        <h1 className="mt-4 text-xl font-bold">سجّل دخولك أولاً</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          سجّل الدخول أو أنشئ حسابًا لمتابعة حالة طلباتك، التواصل مع الدعم، والحصول على أحدث العروض.
        </p>
        <div className="mt-6 flex gap-2.5">
          <button
            onClick={() => navigate("/login")}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90"
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => navigate("/register")}
            className="flex-1 h-11 rounded-xl border font-bold text-sm hover:bg-accent"
          >
            حساب جديد
          </button>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status));

  return (
    <div className="space-y-6">
      {/* بطاقة الحساب */}
      <div className="bg-card border rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="size-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <User className="size-7" />
        </span>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{customer.name}</h1>
          <p className="text-sm text-muted-foreground" dir="ltr">
            {customer.email}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="h-10 px-4 rounded-xl border text-sm font-bold text-destructive hover:bg-destructive/10 transition flex items-center gap-2 w-fit"
        >
          <LogOut className="size-4" />
          خروج
        </button>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="كل الطلبات" value={orders.length} />
        <StatCard label="طلبات جارية" value={activeOrders.length} highlight />
        <StatCard
          label="إجمالي الإنفاق"
          value={formatEGP(
            orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0)
          )}
          money
        />
      </div>

      {/* طلباتي */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Package className="size-5 text-primary" />
            طلباتي
          </h2>
          <button
            onClick={() => navigate("/track")}
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <Search className="size-4" />
            تتبع طلب بالرقم
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-14 border rounded-2xl bg-card">
            <Package className="size-12 text-muted-foreground/40 mx-auto" />
            <p className="mt-3 font-bold">لا توجد طلبات بعد</p>
            <p className="text-sm text-muted-foreground mt-1">ابدأ التسوق وطلباتك هتظهر هنا</p>
            <button
              onClick={() => navigate("/")}
              className="mt-5 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold hover:bg-primary/90"
            >
              ابدأ التسوق
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const st = ORDER_STATUS[order.status] || ORDER_STATUS.PENDING;
              return (
                <button
                  key={order.id}
                  onClick={() => navigate(`/order/${order.orderNumber}`)}
                  className="w-full text-start bg-card border rounded-xl p-4 hover:border-ring/50 hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="size-11 rounded-lg bg-accent/60 flex items-center justify-center shrink-0">
                        <Package className="size-5 text-muted-foreground" />
                      </span>
                      <div>
                        <p className="font-bold text-sm" dir="ltr">
                          {order.orderNumber}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(order.createdAt)} — {order.items.length} منتج
                        </p>
                      </div>
                    </div>
                    <div className="text-end">
                      <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border ${st.color}`}>
                        {st.label}
                      </span>
                      <p className="price-num text-sm font-bold mt-1.5">{formatEGP(order.total)}</p>
                    </div>
                    <ChevronLeft className="size-4 text-muted-foreground shrink-0 hidden sm:block" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* روابط سريعة */}
      <div className="grid sm:grid-cols-2 gap-3">
        <QuickLink
          icon={LifeBuoy}
          title="الدعم الفني"
          desc="افتح تذكرة واحصل على المساعدة"
          onClick={() => navigate("/support")}
        />
        <QuickLink
          icon={Search}
          title="تتبع طلب"
          desc="تابع طلبك برقم الطلب بدون تسجيل"
          onClick={() => navigate("/track")}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  money,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  money?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "bg-primary/5 border-primary/20" : "bg-card"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1.5 font-bold ${money ? "price-num text-sm sm:text-base" : "price-num text-xl sm:text-2xl"}`}>
        {value}
      </p>
    </div>
  );
}

function QuickLink({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3.5 bg-card border rounded-xl p-4 text-start hover:border-ring/50 transition"
    >
      <span className="size-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
        <Icon className="size-5 text-primary" />
      </span>
      <div className="flex-1">
        <p className="font-bold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Eye className="size-4 text-muted-foreground" />
    </button>
  );
}
