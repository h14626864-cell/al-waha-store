"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, Sparkles, BadgePercent, TimerReset } from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import { isFlashActive, currentDiscount } from "@/lib/pricing";
import type { Product } from "@/lib/types";

// ============================================================
// المؤقت التنازلي للعروض — آمن ضد أخطاء hydration:
// السيرفر وبداية رندر الكلاينت بيرجعوا null (نفس الناتج)،
// والحساب الحقيقي بيبدأ بعد التركيب بساعة جهاز العميل.
// لو مفيش تاريخ محدد من اللوحة → نهاية اليوم تلقائيًا.
// ============================================================
function endOfDayTs(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function FlashCountdown({ end }: { end?: string }) {
  const [target, setTarget] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const t = end ? new Date(end).getTime() : endOfDayTs();
    // أول حساب بعد التركيب (rAF) — عشان الرندر الأول يبقى مطابق بين السيرفر والكلاينت
    const frame = requestAnimationFrame(() => {
      if (!Number.isNaN(t) && t > Date.now()) setTarget(t);
      setNow(Date.now());
    });
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(iv);
    };
  }, [end]);

  if (!target || now === null) return null;
  const remaining = target - now;
  if (remaining <= 0) return null;

  const totalSecs = Math.floor(remaining / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const cells = [
    { v: days, l: days === 1 ? "يوم" : "أيام" },
    { v: hours, l: "ساعة" },
    { v: mins, l: "دقيقة" },
    { v: secs, l: "ثانية" },
  ];

  return (
    <div className="mt-7 inline-flex flex-col items-center gap-3">
      <p className="text-xs font-bold text-brass flex items-center gap-1.5">
        <TimerReset className="size-4" />
        العرض بينتهي خلال
      </p>
      <div className="flex items-stretch justify-center gap-2 sm:gap-3" dir="ltr">
        {cells.map((c, i) => (
          <div key={c.l} className="flex items-stretch gap-2 sm:gap-3">
            {i > 0 && (
              <span className="self-center text-primary-foreground/40 font-bold text-lg">:</span>
            )}
            <div className="flex flex-col items-center">
              <span className="price-num min-w-14 sm:min-w-16 rounded-xl bg-background/95 text-primary text-xl sm:text-2xl font-bold px-2.5 py-2 tabular-nums shadow-sm text-center">
                {pad2(c.v)}
              </span>
              <span className="text-[10px] text-primary-foreground/60 mt-1.5">{c.l}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// صفحة العروض — منتجات الخصومات الدائمة + عروض الفلاش (سعر مؤقت بمؤقت)
export function OffersView({
  products,
  loading,
  countdownEnd,
}: {
  products: Product[];
  loading: boolean;
  countdownEnd?: string;
}) {
  // أقرب نهاية عرض فلاش شغّال — بنستخدمها للمؤقت لو مفيش تاريخ محدد من اللوحة
  const earliestSaleEnd = useMemo(() => {
    const ends = products
      .filter((p) => isFlashActive(p) && p.saleEndsAt)
      .map((p) => new Date(p.saleEndsAt as string).getTime())
      .filter((t) => !isNaN(t) && t > Date.now());
    return ends.length ? new Date(Math.min(...ends)).toISOString() : undefined;
  }, [products]);

  const deals = useMemo(() => {
    return products
      .filter(
        (p) =>
          (p.comparePrice && p.comparePrice > p.price) || isFlashActive(p)
      )
      .map((p) => ({
        ...p,
        discountPercent: currentDiscount(p),
      }))
      .filter((p) => p.discountPercent > 0)
      .sort((a, b) => b.discountPercent - a.discountPercent);
  }, [products]);

  const maxDeal = deals[0];

  return (
    <div className="space-y-8">
      {/* ترويسة العروض */}
      <div className="rounded-2xl bg-primary text-primary-foreground overflow-hidden relative">
        <div className="pattern-dots absolute inset-0" />
        <div className="relative px-6 sm:px-10 py-10 text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-brass/90 text-white text-xs font-bold px-4 py-1.5">
            <Flame className="size-3.5" />
            عروض حصرية لفترة محدودة
          </p>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold">
            خصومات تصل إلى{" "}
            <span className="price-num text-brass">{maxDeal ? maxDeal.discountPercent : 30}%</span>
          </h1>
          <p className="mt-3 text-sm text-primary-foreground/70 max-w-md mx-auto leading-relaxed">
            {deals.length} منتج بأسعار مخفضة — العروض لفترة محدودة والأسعار بترجع تلقائيًا بعد انتهاء المؤقت
          </p>
          <FlashCountdown end={earliestSaleEnd || countdownEnd} />
        </div>
      </div>

      {/* العروض */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-20 border rounded-xl bg-card">
          <BadgePercent className="size-12 text-muted-foreground/40 mx-auto" />
          <p className="mt-4 font-bold text-lg">لا توجد عروض حاليًا</p>
          <p className="text-sm text-muted-foreground mt-1.5">
            تابعنا — عروض جديدة كل أسبوع
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-brass" />
              كل العروض ({deals.length})
            </h2>
            <p className="text-xs text-muted-foreground">مرتبة حسب أقوى الخصومات</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {deals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
