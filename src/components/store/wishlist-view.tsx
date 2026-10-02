"use client";

import { Heart, Trash2 } from "lucide-react";
import { ProductCard } from "./product-card";
import { useWishlist } from "@/lib/store";

export function WishlistView() {
  const products = useWishlist((state) => state.products);
  const remove = useWishlist((state) => state.remove);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Heart className="size-6 fill-destructive text-destructive" /> المفضلة</h1>
          <p className="mt-1 text-sm text-muted-foreground">المنتجات التي حفظتها للرجوع إليها لاحقًا</p>
        </div>
        {products.length > 0 && <span className="text-sm text-muted-foreground">{products.length} منتج</span>}
      </div>
      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card py-20 text-center">
          <Heart className="size-12 mx-auto text-muted-foreground/40" />
          <p className="mt-4 font-bold">قائمة المفضلة فارغة</p>
          <p className="mt-1 text-sm text-muted-foreground">اضغط على القلب في أي منتج لحفظه هنا</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {products.map((product) => (
            <div key={product.id} className="relative">
              <ProductCard product={product} />
              <button type="button" onClick={() => remove(product.id)} className="absolute bottom-3 start-3 z-10 rounded-lg bg-background/90 border p-2 text-muted-foreground hover:text-destructive" aria-label="إزالة من المفضلة"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
