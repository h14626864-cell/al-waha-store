"use client";

import { useEffect, useState } from "react";
import { Star, ShoppingBag, Minus, Plus, ShieldCheck, Truck, RotateCcw, ChevronLeft, PackageCheck, Flame, TimerReset, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import { useCart } from "@/lib/store";
import { formatEGP, navigate } from "@/lib/shop-utils";
import { isFlashActive } from "@/lib/pricing";
import { toast } from "sonner";
import type { Product } from "@/lib/types";

// مؤقت تنازلي مدمج لعرض الفلاش — يبدأ بعد التركيب (آمن ضد hydration)
function useCountdown(end?: string | null): string | null {
  const [remaining, setRemaining] = useState<string | null>(null);
  useEffect(() => {
    if (!end) return;
    const t = new Date(end).getTime();
    if (isNaN(t) || t <= Date.now()) return;
    const tick = () => {
      const diff = t - Date.now();
      if (diff <= 0) {
        setRemaining(null);
        return;
      }
      const s = Math.floor(diff / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      const pad = (n: number) => String(n).padStart(2, "0");
      setRemaining(d > 0 ? `${d}ي ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`);
    };
    const frame = requestAnimationFrame(tick);
    const iv = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(iv);
    };
  }, [end]);
  return remaining;
}

export function ProductDetailView({
  slug,
  onGoToCategory,
}: {
  slug: string;
  onGoToCategory: (slug: string) => void;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const add = useCart((s) => s.add);
  // مؤقت العرض — hook لازم يتنده بشرط (قبل أي return مبكر)
  const saleCountdown = useCountdown(product?.saleEndsAt ?? null);

  // يُعاد تحميل البيانات عند تغيير slug — المكوّن يعاد تركيبه بمفتاح slug من الأب
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) {
          setProduct(data.product);
          setSelectedImage(data.product.image);
          setSelectedVariantId(data.product.variants?.[0]?.id || null);
          // اختيار أول مقاس ولون تلقائيًا (لو المنتج فيه خيارات)
          setSelectedSize(data.product.sizes?.[0] || null);
          setSelectedColor((data.product.colors as { name: string }[] | null)?.[0]?.name || null);
          setRelated(data.related || []);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
        <div className="space-y-4">
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          <div className="h-9 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-6 w-1/3 bg-muted rounded animate-pulse" />
          <div className="h-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-24 border rounded-2xl bg-card">
        <PackageCheck className="size-12 text-muted-foreground/40 mx-auto" />
        <p className="mt-4 font-bold text-lg">المنتج غير موجود</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold hover:bg-primary/90"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  const selectedVariant = product.variants?.find((variant) => variant.id === selectedVariantId);

  // ============ التسعير: عرض الفلاش + سعر الـ variant ============
  // عرض الفلاش بيتقدم على كل حاجة — ده سعر ترويجي مؤقت للمنتج كله،
  // وبعد انتهاء التايمر بيرجع سعر الـ variant (لو محدد) أو السعر العادي تلقائيًا
  const flash = isFlashActive(product);
  const variantPrice = selectedVariant?.price ?? null;
  const effectiveP = flash ? (product.salePrice as number) : (variantPrice ?? product.price);
  const effectiveStock = selectedVariant ? selectedVariant.stock : product.stock;
  // السعر المشطوب أثناء العرض = السعر الأصلي اللي هيرجع بعده
  const strike = flash
    ? product.price
    : product.comparePrice && product.comparePrice > effectiveP
      ? product.comparePrice
      : null;
  const discount = strike ? Math.round((1 - effectiveP / strike) * 100) : 0;
  const colors = (product.colors as { name: string; hex: string }[] | null) || [];
  const gallery = [product.image, ...(product.images || []).map((image) => image.url)];

  async function submitReview() {
    if (!reviewName.trim() || !reviewComment.trim()) {
      toast.error("اكتب اسمك وتعليقك أولًا");
      return;
    }
    setReviewSubmitting(true);
    try {
      const response = await fetch(`/api/products/${product.slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: reviewName, comment: reviewComment, rating: reviewRating }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      setProduct((current) => current ? {
        ...current,
        rating: data.product?.rating ?? current.rating,
        reviewsCount: current.reviewsCount + 1,
        reviews: [data.review, ...(current.reviews || [])],
      } : current);
      setReviewName("");
      setReviewComment("");
      setReviewRating(5);
      toast.success("تم إضافة تقييمك بنجاح");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ التقييم");
    } finally {
      setReviewSubmitting(false);
    }
  }

  return (
    <div className="space-y-12">
      {/* مسار التنقل */}
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
        <a href="#/" className="hover:text-foreground">الرئيسية</a>
        <ChevronLeft className="size-3" />
        {product.category && (
          <>
            <button
              onClick={() => onGoToCategory(product.category!.slug)}
              className="hover:text-foreground"
            >
              {product.category.name}
            </button>
            <ChevronLeft className="size-3" />
          </>
        )}
        <span className="text-foreground font-medium">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* الصورة */}
        <div className="relative">
          <div className="aspect-square rounded-2xl overflow-hidden border bg-[#f4f0e8]">
            <img src={selectedImage || product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {gallery.map((image, index) => (
                <button key={`${image}-${index}`} type="button" onClick={() => setSelectedImage(image)} className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 ${selectedImage === image ? "border-primary" : "border-transparent"}`}>
                  <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {discount > 0 && (
            <Badge className="absolute top-4 start-4 bg-destructive text-white text-sm px-3 py-1">
              وفّر {discount}%
            </Badge>
          )}
          {flash && (
            <Badge className="absolute top-4 end-4 bg-amber-500 text-white text-sm px-3 py-1 flex items-center gap-1">
              <Flame className="size-3.5" />
              عرض محدود
            </Badge>
          )}
        </div>

        {/* التفاصيل */}
        <div className="flex flex-col">
          {product.brand && (
            <span className="text-sm font-semibold text-brass uppercase tracking-wide">
              {product.brand}
            </span>
          )}
          <h1 className="mt-1.5 text-2xl lg:text-3xl font-bold leading-snug">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-4 ${
                    i < Math.round(product.rating)
                      ? "fill-brass text-brass"
                      : "fill-muted text-muted"
                  }`}
                />
              ))}
            </div>
            <span className="price-num text-sm font-semibold">{product.rating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground price-num">
              ({product.reviewsCount} تقييم)
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm text-muted-foreground price-num">
              تم بيع {product.soldCount}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <span className={`price-num text-4xl font-bold ${flash ? "text-destructive" : "text-primary"}`}>
              {formatEGP(effectiveP)}
            </span>
            {strike && (
              <span className="price-num text-lg text-muted-foreground line-through mb-1">
                {formatEGP(strike)}
              </span>
            )}
            {flash && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 rounded-full px-3 py-1 mb-1">
                <Flame className="size-3.5" />
                عرض فلاش — وفّر {discount}%
              </span>
            )}
          </div>

          {/* مؤقت العرض التنازلي — بعد انتهائه السعر بيرجع تلقائيًا */}
          {flash && saleCountdown && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2">
              <TimerReset className="size-4 text-amber-700" />
              <span className="text-xs font-semibold text-amber-800">ينتهي العرض خلال</span>
              <span className="price-num text-sm font-bold text-amber-900 tabular-nums" dir="ltr">
                {saleCountdown}
              </span>
            </div>
          )}

          <div className="mt-4">
                {effectiveStock > 0 ? (
              <p className="text-sm font-medium text-emerald-700 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-600" />
                {product.stock <= 5
                  ? `متوفر — باقي ${effectiveStock} قطع فقط!`
                  : "متوفر في المخزون"}
              </p>
            ) : (
              <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-destructive" />
                نفذت الكمية حاليًا
              </p>
            )}
          </div>

          <Separator className="my-5" />

          <p className="text-sm lg:text-[15px] text-foreground/80 leading-[1.9] whitespace-pre-line">
            {product.description}
          </p>

          {/* ============ اختيار المقاس ============ */}
          {(product.sizes || []).length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-bold mb-2.5 flex items-center gap-1.5">
                المقاس
                <span className="text-xs font-medium text-muted-foreground">
                  — المختار: <span className="text-foreground font-bold">{selectedSize}</span>
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {(product.sizes || []).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-12 h-10 px-3.5 rounded-lg border text-sm font-semibold transition ${
                      selectedSize === size
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background hover:border-primary"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ============ اختيار اللون ============ */}
          {colors.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-bold mb-2.5 flex items-center gap-1.5">
                اللون
                <span className="text-xs font-medium text-muted-foreground">
                  — المختار: <span className="text-foreground font-bold">{selectedColor}</span>
                </span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedColor(c.name)}
                    title={c.name}
                    aria-label={c.name}
                    className={`size-9 rounded-full border-2 transition flex items-center justify-center ${
                      selectedColor === c.name
                        ? "border-primary ring-2 ring-primary/30 scale-110"
                        : "border-border hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {selectedColor === c.name && (
                      <Check className="size-4 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.variants && product.variants.length > 0 && (
            <div className="mt-5 rounded-xl bg-accent/40 p-4">
              <p className="text-sm font-bold mb-3">{product.variants[0].type}</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button key={variant.id} type="button" onClick={() => { setSelectedVariantId(variant.id); setQty(1); }} className={`rounded-lg border px-3.5 py-2 text-sm transition ${selectedVariantId === variant.id ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary"}`}>
                    {variant.name} — {formatEGP(variant.price ?? product.price)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-5" />

          {/* الكمية + الإضافة */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center border rounded-xl overflow-hidden h-12">
              <button
                onClick={() => setQty((q) => Math.min(q + 1, effectiveStock))}
                disabled={qty >= effectiveStock}
                className="w-11 h-full flex items-center justify-center hover:bg-accent transition disabled:opacity-30"
                aria-label="زيادة الكمية"
              >
                <Plus className="size-4" />
              </button>
              <span className="price-num w-12 text-center font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="w-11 h-full flex items-center justify-center hover:bg-accent transition disabled:opacity-30"
                aria-label="تقليل الكمية"
              >
                <Minus className="size-4" />
              </button>
            </div>
            <button
              onClick={() => {
                // المنتج فيه مقاسات ولسه مفيش حاجة مختارة (احتياط)
                if ((product.sizes || []).length > 0 && !selectedSize) {
                  toast.error("اختار المقاس الأول");
                  return;
                }
                if (colors.length > 0 && !selectedColor) {
                  toast.error("اختار اللون الأول");
                  return;
                }
                add(
                  {
                    productId: product.id,
                    name: product.name,
                    slug: product.slug,
                    image: product.image,
                    price: effectiveP,
                    stock: effectiveStock,
                    variantId: selectedVariant?.id,
                    variantName: selectedVariant?.name,
                    size: selectedSize ?? undefined,
                    color: selectedColor ?? undefined,
                  },
                  qty
                );
                toast.success("تمت الإضافة إلى السلة", { description: product.name });
              }}
              disabled={effectiveStock === 0}
              className="flex-1 min-w-40 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="size-4.5" />
              أضف إلى السلة — {formatEGP(effectiveP * qty)}
            </button>
          </div>

          {/* مزايا الشراء */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { icon: ShieldCheck, text: "ضمان الوكيل الرسمي" },
              { icon: Truck, text: "شحن سريع 2-4 أيام" },
              { icon: RotateCcw, text: "استرجاع خلال 14 يوم" },
            ].map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-2 rounded-lg bg-accent/60 px-3 py-2.5 text-xs font-medium"
              >
                <f.icon className="size-4 text-primary shrink-0" />
                {f.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* التقييمات */}
      <section className="rounded-2xl border bg-card p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">تقييمات العملاء</h2>
            <p className="mt-1 text-sm text-muted-foreground">شاركنا رأيك في هذا المنتج</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="price-num text-2xl font-bold">{product.rating.toFixed(1)}</span>
            <div className="flex" aria-label={`التقييم ${product.rating} من 5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`size-4 ${i < Math.round(product.rating) ? "fill-brass text-brass" : "text-muted"}`} />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">({product.reviewsCount})</span>
          </div>
        </div>

        <div className="mt-6 grid lg:grid-cols-[1fr_1.2fr] gap-6">
          <div className="rounded-xl bg-accent/40 p-4 space-y-3">
            <h3 className="font-bold">أضف تقييمك</h3>
            <input value={reviewName} onChange={(e) => setReviewName(e.target.value)} placeholder="اسمك" maxLength={80} className="w-full h-11 rounded-lg border bg-background px-3 text-sm" />
            <div className="flex items-center gap-2" dir="ltr">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} type="button" onClick={() => setReviewRating(i + 1)} aria-label={`تقييم ${i + 1}`}>
                  <Star className={`size-6 transition ${i < reviewRating ? "fill-brass text-brass" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="اكتب تجربتك مع المنتج" maxLength={500} rows={4} className="w-full rounded-lg border bg-background p-3 text-sm resize-none" />
            <button type="button" onClick={submitReview} disabled={reviewSubmitting} className="h-11 w-full rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">
              {reviewSubmitting ? "جارٍ الحفظ..." : "إرسال التقييم"}
            </button>
          </div>
          <div className="space-y-3">
            {(product.reviews || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-xl">لا توجد تقييمات مكتوبة بعد — كن أول من يقيّم المنتج.</p>
            ) : (product.reviews || []).map((review) => (
              <article key={review.id} className="border-b last:border-b-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{review.name}</strong>
                  <span className="flex" dir="ltr">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`size-3.5 ${i < review.rating ? "fill-brass text-brass" : "text-muted"}`} />)}</span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* منتجات مشابهة */}
      {related.length > 0 && (
        <section>
          <h2 className="text-xl sm:text-2xl font-bold mb-5">قد يعجبك أيضًا</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function ProductDetailSkeletonList() {
  return <ProductCardSkeleton />;
}
