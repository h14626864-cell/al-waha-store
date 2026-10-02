"use client";

import { useState } from "react";
import { SlidersHorizontal, SearchX } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import type { Category, Product } from "@/lib/types";

interface ShopProps {
  title: string;
  subtitle?: string;
  products: Product[];
  loading: boolean;
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (slug: string) => void;
  sort: string;
  onSortChange: (s: string) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
}

export function ShopView({
  title,
  subtitle,
  products,
  loading,
  categories,
  activeCategory,
  onCategoryChange,
  sort,
  onSortChange,
  searchQuery,
  onClearSearch,
}: ShopProps) {
  const [maxPrice, setMaxPrice] = useState<string>("");

  const filtered =
    maxPrice && !isNaN(parseFloat(maxPrice))
      ? products.filter((p) => p.price <= parseFloat(maxPrice))
      : products;

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div>
        <nav className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
          <a href="#/" className="hover:text-foreground">الرئيسية</a>
          <span>/</span>
          <span className="text-foreground font-medium">{title}</span>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
        {searchQuery && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm">
            <span>
              نتائج البحث عن: <strong>{searchQuery}</strong> ({products.length} نتيجة)
            </span>
            {onClearSearch && (
              <button onClick={onClearSearch} className="text-primary font-bold hover:underline">
                مسح
              </button>
            )}
          </div>
        )}
      </div>

      {/* الفلاتر */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center bg-card border rounded-xl p-3.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <SlidersHorizontal className="size-4" />
          تصفية:
        </div>
        <div className="flex flex-wrap gap-1.5 flex-1">
          <FilterChip
            active={activeCategory === "all"}
            onClick={() => onCategoryChange("all")}
            label="الكل"
          />
          {categories.map((c) => (
            <FilterChip
              key={c.id}
              active={activeCategory === c.slug}
              onClick={() => onCategoryChange(c.slug)}
              label={c.name}
            />
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="أقصى سعر"
            inputMode="numeric"
            className="h-9 w-28 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 price-num"
            aria-label="أقصى سعر"
          />
          <Select value={sort} onValueChange={onSortChange}>
            <SelectTrigger className="h-9 w-40 text-sm" aria-label="ترتيب النتائج">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">الأحدث</SelectItem>
              <SelectItem value="sold">الأكثر مبيعًا</SelectItem>
              <SelectItem value="rating">الأعلى تقييمًا</SelectItem>
              <SelectItem value="price_asc">السعر: من الأقل</SelectItem>
              <SelectItem value="price_desc">السعر: من الأعلى</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* النتائج */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border rounded-xl bg-card">
          <SearchX className="size-12 text-muted-foreground/40 mx-auto" />
          <p className="mt-4 font-bold text-lg">لا توجد منتجات مطابقة</p>
          <p className="text-sm text-muted-foreground mt-1.5">
            جرّب تغيير الفلاتر أو البحث بكلمة أخرى
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground price-num">
            {filtered.length} منتج
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-9 px-4 rounded-lg text-sm font-medium transition border ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-ring hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
