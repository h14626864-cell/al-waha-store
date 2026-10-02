"use client";

import { useState, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, ArrowLeft, Sparkles, Flame, Clock3, Megaphone } from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Banner, Category, Product } from "@/lib/types";

// شرائح الهيرو الافتراضية (تُستبدل ببانرات لوحة التحكم إن وجدت)
const DEFAULT_SLIDES = [
  {
    image: "/hero_banner1.png",
    tag: "مجموعة 2025",
    title: "تسوّق أحدث الأجهزة الأصلية",
    subtitle: "إلكترونيات بضمان الوكيل الرسمي وأسعار تنافسية",
    cta: "اكتشف الإلكترونيات",
    href: "#/category/electronics",
  },
  {
    image: "/hero_banner2.png",
    tag: "عطور فاخرة",
    title: "عطور شرقية تليق بحضورك",
    subtitle: "عود ملكي ومستحضرات عناية أصلية 100%",
    cta: "تسوّق العطور",
    href: "#/category/beauty",
  },
];

interface HeroSlide {
  image: string;
  tag: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
}

function Hero({ slides }: { slides: HeroSlide[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, direction: "rtl" }, [
    Autoplay({ delay: 6000, stopOnInteraction: false }),
  ]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setCurrent(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla]);

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-primary" ref={emblaRef}>
      <div className="flex">
        {slides.map((slide, i) => (
          <div key={i} className="relative min-w-0 flex-[0_0_100%]">
            <div className="relative h-[300px] sm:h-[380px] lg:h-[440px]">
              <img
                src={slide.image}
                alt={slide.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-[#142a1f]/95 via-[#142a1f]/75 to-[#142a1f]/25" />
              <div className="pattern-dots absolute inset-0 opacity-60" />
              <div className="relative h-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col justify-center">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brass/90 text-white text-xs font-semibold px-3.5 py-1.5">
                  <Sparkles className="size-3.5" />
                  {slide.tag}
                </span>
                <h1 className="mt-4 max-w-lg text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.25]">
                  {slide.title}
                </h1>
                <p className="mt-3 max-w-md text-sm sm:text-base text-white/75 leading-relaxed">
                  {slide.subtitle}
                </p>
                <a
                  href={slide.href}
                  className="mt-6 w-fit inline-flex items-center gap-2 rounded-xl bg-white text-primary text-sm font-bold px-6 py-3 hover:bg-cream transition active:scale-95"
                >
                  {slide.cta}
                  <ArrowLeft className="size-4" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* أزرار التنقل */}
      {slides.length > 1 && (
        <>
          <button
            aria-label="الشريحة السابقة"
            onClick={() => embla?.scrollPrev()}
            className="absolute top-1/2 -translate-y-1/2 start-4 size-10 rounded-full bg-white/15 backdrop-blur border border-white/20 text-white flex items-center justify-center hover:bg-white/25 transition"
          >
            <ChevronRight className="size-5" />
          </button>
          <button
            aria-label="الشريحة التالية"
            onClick={() => embla?.scrollNext()}
            className="absolute top-1/2 -translate-y-1/2 end-4 size-10 rounded-full bg-white/15 backdrop-blur border border-white/20 text-white flex items-center justify-center hover:bg-white/25 transition"
          >
            <ChevronLeft className="size-5" />
          </button>
          {/* النقاط */}
          <div className="absolute bottom-4 start-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`الشريحة ${i + 1}`}
                onClick={() => embla?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-7 bg-white" : "w-3 bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface HomeProps {
  categories: Category[];
  products: Product[];
  loading: boolean;
  banners: Banner[];
}

export function HomeView({ categories, products, loading, banners }: HomeProps) {
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const deals = products
    .filter((p) => p.comparePrice && p.comparePrice > p.price)
    .sort((a, b) => (b.comparePrice! - b.price) / b.comparePrice! - (a.comparePrice! - a.price) / a.comparePrice!)
    .slice(0, 4);
  const newArrivals = products.filter((p) => p.isNew).slice(0, 4);
  const bestSellers = [...products].sort((a, b) => b.soldCount - a.soldCount).slice(0, 4);

  // بناء شرائح الهيرو من بانرات لوحة التحكم (HERO) + الافتراضية
  const heroBanners = banners.filter((b) => b.placement === "HERO");
  const heroSlides: HeroSlide[] =
    heroBanners.length > 0
      ? heroBanners.map((b) => ({
          image: b.image || "/hero_banner1.png",
          tag: "إعلان مميز",
          title: b.title,
          subtitle: b.subtitle || "",
          cta: b.ctaText || "تسوّق الآن",
          href: b.link || "#/offers",
        }))
      : DEFAULT_SLIDES;

  // بانرات الشريط (STRIP) والصناديق الترويجية (PROMO)
  const stripBanners = banners.filter((b) => b.placement === "STRIP" && b.active);
  const promoBanners = banners.filter((b) => b.placement === "PROMO" && b.active);

  return (
    <div className="space-y-12 lg:space-y-16">
      <Hero slides={heroSlides} />

      {/* شريط إعلان من لوحة التحكم */}
      {stripBanners[0] && (
        <a
          href={stripBanners[0].link || "#/offers"}
          className="block rounded-xl border bg-brass/10 border-brass/30 px-5 py-3.5 flex items-center gap-3 hover:bg-brass/15 transition"
        >
          <Megaphone className="size-5 text-brass shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#7a5c22] truncate">{stripBanners[0].title}</p>
            {stripBanners[0].subtitle && (
              <p className="text-xs text-muted-foreground truncate">{stripBanners[0].subtitle}</p>
            )}
          </div>
          <ArrowLeft className="size-4 text-brass shrink-0" />
        </a>
      )}

      {/* التصنيفات */}
      <section>
        <div className="flex items-center justify-between mb-5 gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">تسوّق حسب التصنيف</h2>
            <p className="text-sm text-muted-foreground mt-1">اختار القسم اللي يناسبك</p>
          </div>
          {/* تلميح السحب — يظهر على الموبايل فقط */}
          {!loading && categories.length > 2 && (
            <span className="sm:hidden flex items-center gap-1 text-xs font-semibold text-muted-foreground shrink-0">
              اسحب لرؤية المزيد
              <ArrowLeft className="size-3.5 animate-pulse" />
            </span>
          )}
        </div>
        {loading ? (
          <>
            {/* سكيليتون موبايل: شريط أفقي */}
            <div className="flex sm:hidden gap-3.5 overflow-x-auto no-scrollbar -mx-4 px-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-36 shrink-0 rounded-xl" />
              ))}
            </div>
            {/* سكيليتون تابلت/ديسكتوب: جريد */}
            <div className="hidden sm:grid grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* موبايل: شريط تصنيفات أفقي قابل للسحب */}
            <div className="flex sm:hidden gap-3.5 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 pb-1">
              {categories.map((c) => (
                <a
                  key={c.id}
                  href={`#/category/${c.slug}`}
                  className="group relative h-36 w-36 shrink-0 snap-start rounded-xl overflow-hidden border active:scale-95 transition-transform"
                >
                  <img
                    src={c.image || ""}
                    alt={c.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#142a1f]/90 via-[#142a1f]/35 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-3.5">
                    <p className="text-white font-bold text-sm">{c.name}</p>
                    <p className="text-white/60 text-[11px] mt-0.5 price-num">
                      {c._count?.products ?? 0} منتج
                    </p>
                  </div>
                </a>
              ))}
            </div>
            {/* تابلت/ديسكتوب: جريد زي ما هو */}
            <div className="hidden sm:grid grid-cols-3 lg:grid-cols-5 gap-4">
              {categories.map((c) => (
                <a
                  key={c.id}
                  href={`#/category/${c.slug}`}
                  className="group relative h-36 rounded-xl overflow-hidden border"
                >
                  <img
                    src={c.image || ""}
                    alt={c.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#142a1f]/90 via-[#142a1f]/35 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-3.5">
                    <p className="text-white font-bold text-sm sm:text-base">{c.name}</p>
                    <p className="text-white/60 text-[11px] mt-0.5 price-num">
                      {c._count?.products ?? 0} منتج
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </section>

      {/* صناديق ترويجية من لوحة التحكم */}
      {promoBanners.length > 0 && (
        <section className={`grid gap-4 ${promoBanners.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {promoBanners.slice(0, 2).map((b) => (
            <a
              key={b.id}
              href={b.link || "#/offers"}
              className="relative h-40 rounded-2xl overflow-hidden border group"
            >
              {b.image ? (
                <img
                  src={b.image}
                  alt={b.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="absolute inset-0 bg-primary" />
              )}
              <div className="absolute inset-0 bg-gradient-to-l from-[#142a1f]/90 via-[#142a1f]/50 to-transparent" />
              <div className="relative h-full flex flex-col justify-end p-5">
                <p className="text-white font-bold text-lg">{b.title}</p>
                {b.subtitle && <p className="text-white/70 text-sm mt-1">{b.subtitle}</p>}
                <span className="mt-3 w-fit text-xs font-bold text-white bg-brass rounded-lg px-3.5 py-1.5">
                  {b.ctaText || "تسوّق الآن"}
                </span>
              </div>
            </a>
          ))}
        </section>
      )}

      {/* منتجات مميزة */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-brass" />
              مختارات الواحة
            </h2>
            <p className="text-sm text-muted-foreground mt-1">منتجات اختارناها لكم بعناية</p>
          </div>
          <a
            href="#/category/all"
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
          >
            عرض الكل
            <ArrowLeft className="size-4" />
          </a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* بانر العروض */}
      <section className="rounded-2xl bg-primary text-primary-foreground overflow-hidden relative">
        <div className="pattern-dots absolute inset-0" />
        <div className="relative px-6 sm:px-10 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <p className="text-brass text-sm font-bold flex items-center gap-2">
              <Flame className="size-4" />
              عروض الأسبوع
            </p>
            <h3 className="mt-2 text-2xl sm:text-3xl font-bold leading-snug">
              خصومات تصل إلى 30% على منتجات مختارة
            </h3>
            <p className="mt-2 text-sm text-primary-foreground/60">
              استخدم كود <span className="price-num font-bold text-brass">WELCOME10</span> واحصل على
              خصم إضافي 10% على أول طلب
            </p>
          </div>
          <a
            href="#/offers"
            className="shrink-0 rounded-xl bg-brass text-white text-sm font-bold px-6 py-3 hover:bg-brass/90 transition active:scale-95"
          >
            تسوّق العروض
          </a>
        </div>
      </section>

      {/* أقوى العروض */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Flame className="size-5 text-destructive" />
              أقوى الخصومات
            </h2>
            <p className="text-sm text-muted-foreground mt-1">وفّر أكثر مع أفضل الأسعار</p>
          </div>
          <a
            href="#/offers"
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
          >
            كل العروض
            <ArrowLeft className="size-4" />
          </a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : deals.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* وصل حديثًا */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Clock3 className="size-5 text-brass" />
              وصل حديثًا
            </h2>
            <p className="text-sm text-muted-foreground mt-1">أحدث ما أضفناه إلى المتجر</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : newArrivals.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* الأكثر مبيعًا */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">الأكثر مبيعًا</h2>
            <p className="text-sm text-muted-foreground mt-1">اللي بيشتريه عملاؤنا أكتر من غيره</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : bestSellers.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </div>
  );
}
