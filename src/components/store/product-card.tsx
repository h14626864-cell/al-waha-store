"use client";

import { Star, ShoppingBag, Heart, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCart, useWishlist } from "@/lib/store";
import { formatEGP, navigate } from "@/lib/shop-utils";
import { effectivePrice, isFlashActive, currentDiscount } from "@/lib/pricing";
import { toast } from "sonner";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const toggleWishlist = useWishlist((s) => s.toggle);
  const isFavorite = useWishlist((s) => s.products.some((item) => item.id === product.id));

  // السعر الفعلي — سعر الفلاش لو العرض شغّال، وإلا السعر العادي
  const flash = isFlashActive(product);
  const price = effectivePrice(product);
  const strike = currentDiscount(product) > 0
    ? flash
      ? product.price
      : product.comparePrice!
    : null;
  const discount = currentDiscount(product);
  const hasOptions = (product.sizes || []).length > 0 || (product.colors as unknown[] | null || []).length > 0;

  return (
    <div
      className="product-card group bg-card border rounded-xl overflow-hidden cursor-pointer flex flex-col"
      onClick={() => navigate(`/product/${product.slug}`)}
    >
      <div className="relative aspect-square overflow-hidden bg-[#f4f0e8]">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
        />
        <div className="absolute top-2.5 start-2.5 flex flex-col gap-1.5">
          {flash && (
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[11px] px-2 py-0.5 flex items-center gap-1">
              <Flame className="size-3" />
              عرض فلاش
            </Badge>
          )}
          {discount > 0 && (
            <Badge className="bg-destructive hover:bg-destructive text-white text-[11px] px-2 py-0.5">
              خصم {discount}%
            </Badge>
          )}
          {product.isNew && (
            <Badge className="bg-primary hover:bg-primary text-primary-foreground text-[11px] px-2 py-0.5">
              جديد
            </Badge>
          )}
          {product.stock === 0 && (
            <Badge variant="secondary" className="text-[11px] px-2 py-0.5">
              نفذت الكمية
            </Badge>
          )}
        </div>
        <button
          type="button"
          aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
          onClick={(e) => { e.stopPropagation(); toggleWishlist(product); toast.success(isFavorite ? "تمت الإزالة من المفضلة" : "تمت الإضافة إلى المفضلة"); }}
          className="absolute top-2.5 end-2.5 size-9 rounded-full bg-background/90 flex items-center justify-center shadow-sm hover:scale-105 transition"
        >
          <Heart className={`size-4 ${isFavorite ? "fill-destructive text-destructive" : "text-foreground"}`} />
        </button>
      </div>

      <div className="p-3.5 flex flex-col gap-1.5 flex-1">
        {product.brand && (
          <span className="text-[11px] font-medium text-brass uppercase tracking-wide">
            {product.brand}
          </span>
        )}
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.6em]">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="size-3.5 fill-brass text-brass" />
          <span className="price-num font-medium text-foreground">{product.rating.toFixed(1)}</span>
          <span>({product.reviewsCount} تقييم)</span>
        </div>
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="price-num text-base font-bold text-primary">
              {formatEGP(price)}
            </span>
            {strike && (
              <span className="price-num text-xs text-muted-foreground line-through">
                {formatEGP(strike)}
              </span>
            )}
          </div>
          <button
            aria-label={hasOptions ? "اختار المقاس واللون" : "أضف إلى السلة"}
            disabled={product.stock === 0}
            onClick={(e) => {
              e.stopPropagation();
              // المنتج فيه مقاسات أو ألوان → صفحة المنتج عشان يختار الأول
              if (hasOptions) {
                navigate(`/product/${product.slug}`);
                return;
              }
              add(
                {
                  productId: product.id,
                  name: product.name,
                  slug: product.slug,
                  image: product.image,
                  price,
                  stock: product.stock,
                },
                1
              );
              toast.success("تمت الإضافة إلى السلة", {
                description: product.name,
              });
            }}
            className="size-9 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="aspect-square bg-muted animate-pulse" />
      <div className="p-3.5 space-y-2">
        <div className="h-3 w-14 bg-muted rounded animate-pulse" />
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-5 w-1/2 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
