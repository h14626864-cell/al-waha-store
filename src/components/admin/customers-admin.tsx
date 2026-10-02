"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Package, Wallet } from "lucide-react";
import { formatEGP, formatDate } from "@/lib/shop-utils";

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt: string;
  ordersCount: number;
  totalSpent: number;
}

// إدارة العملاء المسجلين
export function CustomersAdmin() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customers");
      const data = await res.json();
      if (data.success) setCustomers(data.customers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = customers.filter(
    (c) =>
      !search.trim() ||
      c.name.includes(search.trim()) ||
      c.email.toLowerCase().includes(search.trim().toLowerCase())
  );

  const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="size-5 text-primary" />
            العملاء
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {customers.length} عميل مسجل — إجمالي إنفاقهم {formatEGP(totalSpent)}
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو البريد..."
          className="h-10 w-full sm:w-64 rounded-lg border bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card">
          <Users className="size-12 text-muted-foreground/40 mx-auto" />
          <p className="mt-3 font-bold">
            {search ? "لا توجد نتائج للبحث" : "لا يوجد عملاء مسجلين بعد"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "جرّب اسمًا أو بريدًا آخر" : "العملاء هيتسجلوا تلقائيًا لما يعملوا حساب"}
          </p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-accent/40 text-muted-foreground text-xs">
                  <th className="text-start px-4 py-3 font-semibold">العميل</th>
                  <th className="text-start px-4 py-3 font-semibold hidden md:table-cell">الهاتف</th>
                  <th className="text-start px-4 py-3 font-semibold">الطلبات</th>
                  <th className="text-start px-4 py-3 font-semibold">إجمالي الإنفاق</th>
                  <th className="text-start px-4 py-3 font-semibold hidden md:table-cell">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-accent/20 transition">
                    <td className="px-4 py-3">
                      <p className="font-bold">{c.name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {c.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {c.phone ? (
                        <span className="price-num" dir="ltr">
                          {c.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 font-bold">
                        <Package className="size-3.5 text-muted-foreground" />
                        {c.ordersCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 font-bold text-primary">
                        <Wallet className="size-3.5" />
                        <span className="price-num">{formatEGP(c.totalSpent)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
