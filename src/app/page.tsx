"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { HomeView } from "@/components/store/home";
import { ShopView } from "@/components/store/shop";
import { ProductDetailView } from "@/components/store/product-detail";
import { CartView } from "@/components/store/cart-view";
import { CheckoutView } from "@/components/store/checkout";
import { OrderSuccessView } from "@/components/store/order-success";
import { AuthView } from "@/components/store/auth-view";
import { AccountView } from "@/components/store/account-view";
import { TrackView } from "@/components/store/track-view";
import { SupportView } from "@/components/store/support-view";
import { OffersView } from "@/components/store/offers-view";
import { PaymentView } from "@/components/store/payment-view";
import { PaymobReturnView } from "@/components/store/paymob-return";
import { WishlistView } from "@/components/store/wishlist-view";
import { CompleteCartView } from "@/components/store/complete-cart";
import { AdminApp } from "@/components/admin/admin-app";
import { useHashRoute, navigate } from "@/lib/shop-utils";
import { useCartHydration } from "@/lib/store";
import type { Banner, Category, Product, StoreSettings } from "@/lib/types";

export default function StorePage() {
  const route = useHashRoute();
  // ترطيب السلة بعد أول رندر (منع hydration mismatch في عدّاد السلة)
  useCartHydration();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [inAdmin, setInAdmin] = useState(false);

  // تحميل التصنيفات والمنتجات والبانرات والإعدادات
  const loadCatalog = useCallback(async () => {
    try {
      const [cRes, pRes, bRes, sRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/products"),
        fetch("/api/banners"),
        fetch("/api/settings"),
      ]);
      const [cData, pData, bData, sData] = await Promise.all([
        cRes.json(),
        pRes.json(),
        bRes.json(),
        sRes.json(),
      ]);
      if (cData.success) setCategories(cData.categories);
      if (pData.success) setAllProducts(pData.products);
      if (bData.success) setBanners(bData.banners);
      if (sData.success) setStoreSettings(sData.settings);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // حالة البحث والتصفية للمتجر
  const [shopCategory, setShopCategory] = useState("all");
  const [shopSort, setShopSort] = useState("default");
  const [searchQuery, setSearchQuery] = useState("");

  // تمرير لأعلى عند تغيير الصفحة
  useEffect(() => {
    setInAdmin(route.startsWith("/admin"));
  }, [route]);

  const goSearch = (q: string) => {
    setSearchQuery(q);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  // ============ لوحة التحكم ============
  if (inAdmin) {
    return <AdminApp onExit={() => navigate("/")} />;
  }

  // ============ المتجر ============
  const [routePath, routeQueryString] = route.split("?");
  const routeParts = routePath.split("/").filter(Boolean);
  const queryParams = new URLSearchParams(routeQueryString || "");

  let content: React.ReactNode;

  if (routeParts[0] === "product" && routeParts[1]) {
    // صفحة منتج
    content = (
      <ProductDetailView
        key={decodeURIComponent(routeParts[1])}
        slug={decodeURIComponent(routeParts[1])}
        onGoToCategory={(slug) => {
          setShopCategory(slug);
          navigate(`/category/${slug}`);
        }}
      />
    );
  } else if (routeParts[0] === "category" && routeParts[1]) {
    // صفحة تصنيف
    const slug = routeParts[1];
    if (shopCategory !== slug) setShopCategory(slug);
    content = (
      <CategoryOrShop
        key={slug}
        slug={slug}
        categories={categories}
        products={allProducts}
        loading={productsLoading}
        shopCategory={shopCategory}
        setShopCategory={setShopCategory}
        shopSort={shopSort}
        setShopSort={setShopSort}
      />
    );
  } else if (routeParts[0] === "search") {
    // نتائج البحث
    const q = queryParams.get("q") || "";
    content = (
      <ShopView
        title="نتائج البحث"
        products={filterSearch(allProducts, q)}
        loading={productsLoading}
        categories={categories}
        activeCategory="all"
        onCategoryChange={(s) => navigate(`/category/${s}`)}
        sort={shopSort}
        onSortChange={setShopSort}
        searchQuery={q}
        onClearSearch={() => {
          setSearchQuery("");
          navigate("/");
        }}
      />
    );
  } else if (routeParts[0] === "offers") {
    // صفحة العروض (مع المؤقت التنازلي من الإعدادات)
    content = (
      <OffersView
        products={allProducts}
        loading={productsLoading}
        countdownEnd={storeSettings?.offers_countdown_end}
      />
    );
  } else if (routeParts[0] === "wishlist") {
    content = <WishlistView />;
  } else if (routeParts[0] === "complete-cart") {
    // استرجاع سلة متروكة من لينك الإيميل — token إجباري
    content = <CompleteCartView key={queryParams.get("token") || ""} token={queryParams.get("token") || ""} />;
  } else if (routeParts[0] === "track") {
    // تتبع الطلب بالرقم
    content = <TrackView key={queryParams.get("order") || ""} initialOrderNumber={queryParams.get("order") || undefined} />;
  } else if (routeParts[0] === "support") {
    // الدعم الفني
    content = <SupportView key={queryParams.get("ticket") || ""} openTicketNumber={queryParams.get("ticket") || undefined} />;
  } else if (routeParts[0] === "login" || routeParts[0] === "register") {
    // تسجيل الدخول / إنشاء حساب
    content = <AuthView key={routeParts[0]} mode={routeParts[0] === "login" ? "login" : "register"} />;
  } else if (routeParts[0] === "account") {
    // حساب العميل وطلباته
    content = <AccountView />;
  } else if (routeParts[0] === "paymob" && routeParts[1] === "return") {
    // الرجوع من بوابة بايموب بعد الدفع
    content = <PaymobReturnView key={routeQueryString} />;
  } else if (routeParts[0] === "pay" && routeParts[1]) {
    // صفحة إتمام الدفع عبر بايموب
    content = <PaymentView key={decodeURIComponent(routeParts[1])} orderNumber={decodeURIComponent(routeParts[1])} />;
  } else if (routeParts[0] === "cart") {
    content = <CartView />;
  } else if (routeParts[0] === "checkout") {
    content = <CheckoutView />;
  } else if (routeParts[0] === "order" && routeParts[1]) {
    content = <OrderSuccessView orderNumber={decodeURIComponent(routeParts[1])} />;
  } else {
    // الرئيسية
    content = (
      <HomeView
        categories={categories}
        products={allProducts}
        loading={productsLoading}
        banners={banners}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        categories={categories}
        onSearch={goSearch}
        announcement={storeSettings?.announcement}
        storeName={storeSettings?.store_name}
        storeNameEn={storeSettings?.store_name_en}
        storeLogo={storeSettings?.store_logo}
        supportPhone={storeSettings?.support_phone}
      />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:py-8">{content}</main>
      <Footer
        storeName={storeSettings?.store_name}
        storeNameEn={storeSettings?.store_name_en}
        storeLogo={storeSettings?.store_logo}
        storeEmail={storeSettings?.store_email}
        storeAddress={storeSettings?.store_address}
        supportPhone={storeSettings?.support_phone}
      />
    </div>
  );
}

// صفحة تصنيف مع الترتيب والتصفية
function CategoryOrShop({
  slug,
  categories,
  products,
  loading,
  shopCategory,
  setShopCategory,
  shopSort,
  setShopSort,
}: {
  slug: string;
  categories: Category[];
  products: Product[];
  loading: boolean;
  shopCategory: string;
  setShopCategory: (s: string) => void;
  shopSort: string;
  setShopSort: (s: string) => void;
}) {
  const category = categories.find((c) => c.slug === slug);
  const title = slug === "all" ? "كل المنتجات" : category ? category.name : "التصنيف";

  // فلترة المنتجات حسب التصنيف المحدد
  const filtered = slug === "all" ? products : products.filter((p) => p.category?.slug === slug);

  return (
    <ShopView
      title={title}
      subtitle={category?.description || undefined}
      products={filtered}
      loading={loading}
      categories={categories}
      activeCategory={slug}
      onCategoryChange={(s) => {
        setShopCategory(s);
        navigate(`/category/${s}`);
      }}
      sort={shopSort}
      onSortChange={setShopSort}
    />
  );
}

// فلترة البحث محليًا (البيانات كلها محملة)
function filterSearch(products: Product[], q: string): Product[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(needle) ||
      p.description.toLowerCase().includes(needle) ||
      (p.brand && p.brand.toLowerCase().includes(needle)) ||
      (p.category?.name && p.category.name.toLowerCase().includes(needle))
  );
}
