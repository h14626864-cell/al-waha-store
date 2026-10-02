"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Ticket,
  LogOut,
  Store,
  Loader2,
  ShieldCheck,
  Megaphone,
  LifeBuoy,
  Users,
  Settings2,
  MailWarning,
} from "lucide-react";
import { Dashboard } from "./dashboard";
import { ProductsAdmin } from "./products-admin";
import { OrdersAdmin } from "./orders-admin";
import { CategoriesAdmin } from "./categories-admin";
import { CouponsAdmin } from "./coupons-admin";
import { BannersAdmin } from "./banners-admin";
import { SupportAdmin } from "./support-admin";
import { CustomersAdmin } from "./customers-admin";
import { SettingsAdmin } from "./settings-admin";
import { AbandonedCartsAdmin } from "./abandoned-carts-admin";
import { toast } from "sonner";
import type { AdminInfo } from "@/lib/types";

type AdminTab =
  | "dashboard"
  | "products"
  | "orders"
  | "carts"
  | "categories"
  | "coupons"
  | "banners"
  | "customers"
  | "support"
  | "settings";

export function AdminApp({ onExit }: { onExit: () => void }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<AdminTab>("dashboard");

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/me");
      if (res.status === 401) {
        setAdmin(null);
      } else {
        const data = await res.json();
        if (data.success) setAdmin(data.admin);
      }
    } catch {
      setAdmin(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAdmin(null);
    toast.success("تم تسجيل الخروج");
  };

  if (checking) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!admin) {
    return <AdminLogin onLogin={setAdmin} />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* الشريط الجانبي */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-l bg-card">
        <div className="p-5 border-b">
          <div className="flex items-center gap-2.5">
            <span className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <ShieldCheck className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="font-bold text-primary">لوحة التحكم</p>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
                Al-Waha Admin
              </p>
            </div>
          </div>
        </div>
        <SidebarNav tab={tab} setTab={setTab} />
        <div className="mt-auto p-4 border-t space-y-2">
          <div className="rounded-lg bg-accent/60 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">مسجّل الدخول كـ</p>
            <p className="text-sm font-bold mt-0.5">{admin.name}</p>
            <p className="text-[11px] text-muted-foreground" dir="ltr">{admin.email}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onExit}
              className="flex-1 h-9 rounded-lg border text-xs font-semibold hover:bg-accent transition"
            >
              عرض المتجر
            </button>
            <button
              onClick={logout}
              className="flex-1 h-9 rounded-lg bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition flex items-center justify-center gap-1"
            >
              <LogOut className="size-3.5" />
              خروج
            </button>
          </div>
        </div>
      </aside>

      {/* المحتوى */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* شريط الموبايل */}
        <div className="lg:hidden sticky top-0 z-40 bg-card border-b px-4 h-14 flex items-center justify-between">
          <p className="font-bold text-primary flex items-center gap-2">
            <ShieldCheck className="size-5" />
            لوحة التحكم
          </p>
          <div className="flex gap-2">
            <button
              onClick={onExit}
              className="h-8 px-3 rounded-lg border text-xs font-semibold"
            >
              المتجر
            </button>
            <button
              onClick={logout}
              className="h-8 px-3 rounded-lg bg-destructive/10 text-destructive text-xs font-bold"
            >
              خروج
            </button>
          </div>
        </div>
        <div className="lg:hidden px-4 py-3 border-b bg-card overflow-x-auto">
          <SidebarNav tab={tab} setTab={setTab} horizontal />
        </div>

        <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto">
          {tab === "dashboard" && <Dashboard />}
          {tab === "products" && <ProductsAdmin />}
          {tab === "orders" && <OrdersAdmin />}
          {tab === "carts" && <AbandonedCartsAdmin />}
          {tab === "categories" && <CategoriesAdmin />}
          {tab === "coupons" && <CouponsAdmin />}
          {tab === "banners" && <BannersAdmin />}
          {tab === "customers" && <CustomersAdmin />}
          {tab === "support" && <SupportAdmin />}
          {tab === "settings" && <SettingsAdmin />}
        </main>
      </div>
    </div>
  );
}

function SidebarNav({
  tab,
  setTab,
  horizontal,
}: {
  tab: AdminTab;
  setTab: (t: AdminTab) => void;
  horizontal?: boolean;
}) {
  const items = [
    { key: "dashboard" as const, label: "النظرة العامة", icon: LayoutDashboard },
    { key: "products" as const, label: "المنتجات", icon: Package },
    { key: "orders" as const, label: "الطلبات", icon: ShoppingCart },
    { key: "carts" as const, label: "السلات المتروكة", icon: MailWarning },
    { key: "categories" as const, label: "التصنيفات", icon: FolderTree },
    { key: "coupons" as const, label: "أكواد الخصم", icon: Ticket },
    { key: "banners" as const, label: "البانرات والإعلانات", icon: Megaphone },
    { key: "customers" as const, label: "العملاء", icon: Users },
    { key: "support" as const, label: "الدعم الفني", icon: LifeBuoy },
    { key: "settings" as const, label: "الإعدادات", icon: Settings2 },
  ];

  if (horizontal) {
    return (
      <nav className="flex gap-1.5">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => setTab(it.key)}
            className={`h-9 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              tab === it.key
                ? "bg-primary text-primary-foreground"
                : "bg-accent/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <it.icon className="size-3.5" />
            {it.label}
          </button>
        ))}
      </nav>
    );
  }

  return (
    <nav className="p-3 space-y-1">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => setTab(it.key)}
          className={`w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition ${
            tab === it.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <it.icon className="size-4.5" />
          {it.label}
        </button>
      ))}
    </nav>
  );
}

function AdminLogin({ onLogin }: { onLogin: (a: AdminInfo) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`أهلاً بعودتك، ${data.admin.name}`);
        onLogin(data.admin);
      } else {
        setError(data.error || "بيانات غير صحيحة");
      }
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border rounded-2xl p-7 shadow-sm">
        <div className="text-center">
          <span className="inline-flex size-14 rounded-2xl bg-primary text-primary-foreground items-center justify-center">
            <Store className="size-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold">لوحة تحكم الواحة</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            سجّل الدخول لإدارة المتجر والطلبات
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">البريد الإلكتروني</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@alwaha.com"
              type="email"
              dir="ltr"
              className="w-full h-11 rounded-lg border bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/30 text-end"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">كلمة المرور</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              dir="ltr"
              className="w-full h-11 rounded-lg border bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/30 text-end"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3.5 py-2.5 font-medium">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "تسجيل الدخول"}
          </button>
        </form>

        <div className="mt-5 rounded-lg bg-accent/60 border px-4 py-3 text-xs leading-relaxed">
          <p className="font-bold text-primary mb-1">بيانات الدخول التجريبية:</p>
          <p dir="ltr" className="price-num text-end">
            admin@alwaha.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
