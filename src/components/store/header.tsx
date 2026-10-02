"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ShoppingBag,
  Menu,
  Truck,
  Phone,
  Store,
  User,
  Package,
  LifeBuoy,
  LogIn,
  LogOut,
  BadgePercent,
  MapPin,
  Heart,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useCart, useCustomer } from "@/lib/store";
import { navigate, useHashRoute } from "@/lib/shop-utils";
import type { Category } from "@/lib/types";

interface HeaderProps {
  categories: Category[];
  onSearch: (q: string) => void;
  announcement?: string;
  storeName?: string;
  storeNameEn?: string;
  storeLogo?: string;
  supportPhone?: string;
}

export function Header({
  categories,
  onSearch,
  announcement,
  storeName = "الواحة",
  storeNameEn = "Al-Waha Store",
  storeLogo = "",
  supportPhone = "19999",
}: HeaderProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const count = useCart((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0));
  const route = useHashRoute();
  const { customer, logout } = useCustomer();

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navLinkCls = (path: string) =>
    `px-3.5 py-2.5 text-sm font-medium transition border-b-2 ${
      route === path ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <header className="sticky top-0 z-50">
      {/* شريط الإعلانات العلوي (من لوحة التحكم) */}
      <div className="bg-primary text-primary-foreground text-xs">
        <div className="max-w-7xl mx-auto px-4 h-8 flex items-center justify-between gap-4">
          <p className="flex items-center gap-1.5 truncate">
            <Truck className="size-3.5 shrink-0" />
            <span className="truncate">{announcement || "شحن مجاني للطلبات فوق 3000 ج.م"}</span>
          </p>
          <p className="hidden md:flex items-center gap-1.5 shrink-0">
            <Phone className="size-3.5" />
            <span className="price-num">خدمة العملاء: {supportPhone}</span>
          </p>
        </div>
      </div>

      {/* الشريط الرئيسي */}
      <div className="bg-card/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          {/* الشعار */}
          <a
            href="#/"
            className="flex items-center gap-2.5 shrink-0"
            aria-label={`الصفحة الرئيسية - ${storeName}`}
          >
            {storeLogo ? (
              <img
                src={storeLogo}
                alt={storeName}
                className="size-10 rounded-xl object-cover border"
              />
            ) : (
              <span className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Store className="size-5" />
              </span>
            )}
            <span className="leading-tight">
              <span className="block font-bold text-lg text-primary">{storeName}</span>
              <span className="block text-[10px] text-muted-foreground tracking-widest uppercase">
                {storeNameEn}
              </span>
            </span>
          </a>

          {/* البحث (سطح المكتب) */}
          <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-xl relative">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن منتج، ماركة، أو تصنيف..."
              className="w-full h-11 rounded-xl border bg-background/80 ps-10 pe-24 text-sm outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition placeholder:text-muted-foreground"
              aria-label="بحث في المتجر"
            />
            <button
              type="submit"
              className="absolute end-1.5 top-1/2 -translate-y-1/2 h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition"
            >
              بحث
            </button>
          </form>

          {/* حسابي + السلة + القائمة */}
          <div className="flex items-center gap-2 ms-auto">
            {/* قائمة الحساب */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="size-10 rounded-xl border flex items-center justify-center hover:bg-accent transition"
                  aria-label="حسابي"
                >
                  <User className="size-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {customer ? (
                  <>
                    <DropdownMenuLabel>
                      <p className="font-bold">{customer.name}</p>
                      <p className="text-xs text-muted-foreground font-normal" dir="ltr">
                        {customer.email}
                      </p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/account")}>
                      <Package className="size-4" />
                      طلباتي وحسابي
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/support")}>
                      <LifeBuoy className="size-4" />
                      الدعم الفني
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="size-4" />
                      تسجيل الخروج
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuLabel>مرحبًا بك في {storeName} 👋</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/login")}>
                      <LogIn className="size-4" />
                      تسجيل الدخول
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/register")}>
                      <User className="size-4" />
                      إنشاء حساب جديد
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/track")}>
                      <MapPin className="size-4" />
                      تتبع طلب بالرقم
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <a
              href="#/cart"
              className="relative size-10 rounded-xl border flex items-center justify-center hover:bg-accent transition"
              aria-label={`سلة التسوق — ${count} منتج`}
            >
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <span className="price-num absolute -top-1.5 -start-1.5 min-w-5 h-5 px-1 rounded-full bg-brass text-brass-foreground text-[11px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </a>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button
                  className="md:hidden size-10 rounded-xl border flex items-center justify-center hover:bg-accent transition"
                  aria-label="القائمة"
                >
                  <Menu className="size-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0 flex flex-col">
                <div className="p-5 border-b">
                  <SheetTitle className="text-primary font-bold text-lg">{storeName}</SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">تسوق بثقة، توصيل سريع</p>
                </div>
                <nav className="p-3 overflow-y-auto flex-1">
                  {customer && (
                    <a
                      href="#/account"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold text-primary hover:bg-accent"
                    >
                      <User className="size-4.5" />
                      حسابي — {customer.name}
                    </a>
                  )}
                  <a
                    href="#/offers"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent"
                  >
                    <BadgePercent className="size-4.5 text-destructive" />
                    العروض والخصومات
                  </a>
                  <a
                    href="#/wishlist"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent"
                  >
                    <Heart className="size-4.5 text-destructive" />
                    المفضلة
                  </a>
                  <a
                    href="#/track"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent"
                  >
                    <MapPin className="size-4.5" />
                    تتبع طلبك
                  </a>
                  <a
                    href="#/support"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent"
                  >
                    <LifeBuoy className="size-4.5" />
                    الدعم الفني
                  </a>
                  {!customer && (
                    <a
                      href="#/login"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent"
                    >
                      <LogIn className="size-4.5" />
                      تسجيل الدخول / حساب جديد
                    </a>
                  )}
                  <div className="border-t my-2" />
                  <p className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    التصنيفات
                  </p>
                  {categories.map((c) => (
                    <a
                      key={c.id}
                      href={`#/category/${c.slug}`}
                      onClick={() => setOpen(false)}
                      className="block px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition"
                    >
                      {c.name}
                    </a>
                  ))}
                </nav>
                {/* بحث الموبايل */}
                <form onSubmit={submitSearch} className="px-5 pb-5 relative">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ابحث..."
                    className="w-full h-10 rounded-lg border bg-background ps-3 pe-11 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                    aria-label="بحث"
                  />
                  <button
                    type="submit"
                    className="absolute end-6 top-0 h-10 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1"
                    aria-label="ابحث"
                  >
                    <Search className="size-4" />
                  </button>
                </form>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* شريط التصنيفات (سطح المكتب) */}
        <nav className="hidden md:block border-t bg-card" aria-label="التصنيفات">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-1">
            <a href="#/" className={navLinkCls("/")}>
              الرئيسية
            </a>
            <a href="#/offers" className={navLinkCls("/offers")}>
              <span className="flex items-center gap-1.5">
                <BadgePercent className="size-4 text-destructive" />
                العروض
              </span>
            </a>
            {categories.map((c) => (
              <a key={c.id} href={`#/category/${c.slug}`} className={navLinkCls(`/category/${c.slug}`)}>
                {c.name}
              </a>
            ))}
            <a href="#/track" className={navLinkCls("/track")}>
              تتبع طلبك
            </a>
            <a href="#/support" className={navLinkCls("/support")}>
              الدعم
            </a>
            <span className="ms-auto text-xs font-medium text-brass flex items-center gap-1.5 py-2.5">
              <Truck className="size-4" />
              شحن سريع خلال 2-4 أيام
            </span>
          </div>
        </nav>
      </div>
    </header>
  );
}
