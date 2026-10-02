"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Loader2, Ticket } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/shop-utils";
import { toast } from "sonner";
import type { Coupon } from "@/lib/types";

export function CouponsAdmin() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/coupons");
    const data = await res.json();
    if (data.success) setCoupons(data.coupons);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!code.trim() || !percent) {
      toast.error("أدخل الكود ونسبة الخصم");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, discountPercent: percent }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم إضافة كود الخصم");
        setCode("");
        setPercent("");
        load();
      } else {
        toast.error(data.error || "حدث خطأ");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: Coupon) => {
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    load();
  };

  const remove = async (c: Coupon) => {
    const res = await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("تم حذف الكود");
      load();
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">أكواد الخصم</h1>
        <p className="text-sm text-muted-foreground mt-1">
          أنشئ أكواد خصم يستخدمها العملاء في السلة
        </p>
      </div>

      {/* إضافة كود */}
      <div className="bg-card border rounded-xl p-4 flex flex-col sm:flex-row gap-2.5 sm:items-end">
        <div className="space-y-1.5 flex-1">
          <label className="text-sm font-semibold">الكود</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SUMMER25"
            dir="ltr"
            className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 text-end font-bold tracking-wider"
          />
        </div>
        <div className="space-y-1.5 sm:w-36">
          <label className="text-sm font-semibold">نسبة الخصم %</label>
          <input
            value={percent}
            onChange={(e) => setPercent(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            dir="ltr"
            className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 text-end price-num"
          />
        </div>
        <button
          onClick={add}
          disabled={saving}
          className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          إضافة
        </button>
      </div>

      {/* القائمة */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-card border rounded-xl text-center py-14">
          <Ticket className="size-10 text-muted-foreground/30 mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">لا توجد أكواد خصم بعد</p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl divide-y">
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-4">
              <span className="size-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <Ticket className="size-5 text-primary" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold tracking-wider" dir="ltr">
                  {c.code}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 price-num">
                  خصم {c.discountPercent}% — أضيف في {formatDate(c.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs font-bold rounded-full px-2.5 py-1 ${
                    c.active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-muted text-muted-foreground border"
                  }`}
                >
                  {c.active ? "نشط" : "موقوف"}
                </span>
                <Switch checked={c.active} onCheckedChange={() => toggle(c)} />
                <button
                  onClick={() => remove(c)}
                  className="size-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive transition"
                  aria-label="حذف الكود"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
