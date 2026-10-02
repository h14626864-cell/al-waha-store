"use client";

import { useEffect, useState, useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CustomerInfo, Product } from "@/lib/types";

export interface CartLine {
  id: string; // معرّف السطر = productId|size|color|variantId
  productId: string;
  variantId?: string;
  variantName?: string;
  size?: string;
  color?: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  quantity: number;
  stock: number;
}

// توليد معرّف فريد لسطر السلة (نفس المنتج بمقاس/لون مختلف = سطر مختلف)
export function makeLineId(productId: string, size?: string | null, color?: string | null, variantId?: string | null): string {
  return [productId, size || "", color || "", variantId || ""].join("|");
}

interface CartState {
  lines: CartLine[];
  add: (line: Omit<CartLine, "quantity" | "id"> & { id?: string }, qty?: number) => void;
  remove: (lineId: string) => void;
  setQty: (lineId: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (line, qty = 1) =>
        set((state) => {
          const id = line.id || makeLineId(line.productId, line.size, line.color, line.variantId);
          const existing = state.lines.find((l) => l.id === id);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.id === id ? { ...l, quantity: Math.min(l.quantity + qty, l.stock) } : l
              ),
            };
          }
          return { lines: [...state.lines, { ...line, id, quantity: Math.min(qty, line.stock) }] as CartLine };
        }),
      remove: (lineId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.id !== lineId) })),
      setQty: (lineId, qty) =>
        set((state) => ({
          lines: state.lines
            .map((l) =>
              l.id === lineId
                ? { ...l, quantity: Math.max(1, Math.min(qty, l.stock)) }
                : l
            )
            .filter((l) => l.quantity > 0),
        })),
      clear: () => set({ lines: [] }),
      count: () => get().lines.reduce((s, l) => s + l.quantity, 0),
      subtotal: () => get().lines.reduce((s, l) => s + l.price * l.quantity, 0),
    }),
    // skipHydration: مهم جدًا — من غيره السلة بتترطب من localStorage قبل الـ hydration
    // وده بيخلي عدّاد السلة في الهيدر مختلف عن HTML السيرفر → hydration error
    { name: "alwaha-cart", skipHydration: true }
  )
);

interface WishlistState {
  products: Product[];
  toggle: (product: Product) => void;
  has: (productId: string) => boolean;
  remove: (productId: string) => void;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      products: [],
      toggle: (product) => set((state) => ({
        products: state.products.some((item) => item.id === product.id)
          ? state.products.filter((item) => item.id !== product.id)
          : [...state.products, product],
      })),
      has: (productId) => get().products.some((item) => item.id === productId),
      remove: (productId) => set((state) => ({ products: state.products.filter((item) => item.id !== productId) })),
    }),
    { name: "alwaha-wishlist", skipHydration: true }
  )
);

// إعادة ترطيب السلة بعد أول رندر — بنناديها مرة واحدة من الجذر (page.tsx)
export function useCartHydration() {
  useEffect(() => {
    useCart.persist.rehydrate();
    useWishlist.persist.rehydrate();
    useRecentlyViewed.persist.rehydrate();
    // ترحيل سلات قديمة: سطور بدون معرّف id بنولّده من بياناتها
    const lines = useCart.getState().lines;
    if (lines.some((l) => !l.id)) {
      useCart.setState({
        lines: lines.map((l) => ({ ...l, id: l.id || makeLineId(l.productId, l.size, l.color, l.variantId) })),
      });
    }
  }, []);
}

// ============ شاهدته مؤخرًا (آخر 8 منتجات) ============
interface RecentState {
  slugs: string[];
  push: (slug: string) => void;
}

export const useRecentlyViewed = create<RecentState>()(
  persist(
    (set, get) => ({
      slugs: [],
      push: (slug) =>
        set((state) => ({ slugs: [slug, ...state.slugs.filter((s) => s !== slug)].slice(0, 8) })),
    }),
    { name: "alwaha-recent", skipHydration: true }
  )
);

// واجهة الكوبون المطبق (غير مخزنة بشكل دائم)
interface CouponState {
  code: string | null;
  percent: number;
  apply: (code: string, percent: number) => void;
  reset: () => void;
}

export const useAppliedCoupon = create<CouponState>((set) => ({
  code: null,
  percent: 0,
  apply: (code, percent) => set({ code, percent }),
  reset: () => set({ code: null, percent: 0 }),
}));

// ============ جلسة العميل (تسجيل الدخول) ============
export function useCustomer() {
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.success ? data.customer : null);
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCustomer(null);
  }, []);

  return { customer, loading, refresh, logout };
}
