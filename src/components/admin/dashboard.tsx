"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { formatEGP, formatDate } from "@/lib/shop-utils";
import { ORDER_STATUS } from "@/lib/types";

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  totalRevenue: number;
  todayRevenue: number;
  todayOrders: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

interface TopProduct {
  name: string;
  soldCount: number;
  price: number;
}

export function Dashboard() {
  const [data, setData] = useState<{
    stats: Stats;
    recentOrders: RecentOrder[];
    topProducts: TopProduct[];
    salesByDay: { day: string; total: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return <p className="text-center text-muted-foreground py-20">فشل تحميل البيانات</p>;

  const { stats, recentOrders, topProducts, salesByDay } = data;
  const maxSales = Math.max(...salesByDay.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">النظرة العامة</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ملخص أداء المتجر اليوم وآخر 7 أيام
        </p>
      </div>

      {/* كروت الإحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          icon={TrendingUp}
          label="إجمالي الإيرادات"
          value={formatEGP(stats.totalRevenue)}
          sub={`اليوم: ${formatEGP(stats.todayRevenue)}`}
        />
        <StatCard
          icon={ShoppingCart}
          label="إجمالي الطلبات"
          value={String(stats.totalOrders)}
          sub={`اليوم: ${stats.todayOrders} طلب`}
        />
        <StatCard
          icon={Clock3}
          label="قيد المراجعة"
          value={String(stats.pendingOrders)}
          sub="تحتاج تأكيدًا"
          highlight={stats.pendingOrders > 0}
        />
        <StatCard
          icon={Package}
          label="المنتجات"
          value={String(stats.totalProducts)}
          sub={stats.lowStockProducts > 0 ? `${stats.lowStockProducts} منتج مخزونه منخفض` : "المخزون بحالة جيدة"}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* مبيعات الأسبوع */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-bold mb-5">مبيعات آخر 7 أيام</h2>
          <div className="flex items-end justify-between gap-2 h-44" dir="ltr">
            {[...salesByDay].reverse().map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="price-num text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                  {d.total > 0 ? Math.round(d.total / 1000) + "k" : "0"}
                </span>
                <div
                  className="w-full max-w-10 rounded-t-lg bg-primary transition-all hover:bg-primary/80"
                  style={{ height: `${Math.max((d.total / maxSales) * 100, 3)}%` }}
                  title={`${d.day}: ${formatEGP(d.total)}`}
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* الأكثر مبيعًا */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-bold mb-4">الأكثر مبيعًا</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مبيعات بعد</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span
                    className={`price-num size-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0
                        ? "bg-brass text-white"
                        : "bg-accent text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1">{p.name}</p>
                    <p className="price-num text-xs text-muted-foreground">{formatEGP(p.price)}</p>
                  </div>
                  <span className="price-num text-sm font-bold text-primary shrink-0">
                    {p.soldCount} مبيع
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* أحدث الطلبات */}
      <div className="bg-card border rounded-xl p-5">
        <h2 className="font-bold mb-4">أحدث الطلبات</h2>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد طلبات بعد</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-start pb-2.5 font-medium">رقم الطلب</th>
                  <th className="text-start pb-2.5 font-medium">العميل</th>
                  <th className="text-start pb-2.5 font-medium">الإجمالي</th>
                  <th className="text-start pb-2.5 font-medium">الحالة</th>
                  <th className="text-start pb-2.5 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-3 price-num font-semibold text-primary" dir="ltr">
                      {o.orderNumber}
                    </td>
                    <td className="py-3">{o.customerName}</td>
                    <td className="py-3 price-num font-bold">{formatEGP(o.total)}</td>
                    <td className="py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const info = ORDER_STATUS[status] || { label: status, color: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${info.color}`}>
      {info.label}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-card border rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span
          className={`size-8 rounded-lg flex items-center justify-center ${
            highlight ? "bg-amber-100 text-amber-700" : "bg-accent text-primary"
          }`}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="price-num mt-2 text-lg sm:text-xl font-bold leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
