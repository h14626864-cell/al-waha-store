// ============================================================
// تسعير المنتجات الموحّد — مع دعم عروض الفلاش (سعر مؤقت ينتهي بتاريخ)
// بيتستخدم في السيرفر (حساب الطلبات) والكلاينت (العرض) بنفس المنطق
// ============================================================

export interface PriceableProduct {
  price: number;
  comparePrice?: number | null;
  salePrice?: number | null;
  saleEndsAt?: string | Date | null;
}

// هل عرض الفلاش شغّال الآن؟
export function isFlashActive(p: PriceableProduct): boolean {
  if (p.salePrice == null || p.salePrice <= 0) return false;
  if (p.salePrice >= p.price) return false;
  if (!p.saleEndsAt) return false;
  const end = new Date(p.saleEndsAt).getTime();
  return !isNaN(end) && end > Date.now();
}

// السعر الفعلي الحالي (سعر الفلاش لو العرض شغّال، وإلا السعر العادي)
export function effectivePrice(p: PriceableProduct): number {
  return isFlashActive(p) ? (p.salePrice as number) : p.price;
}

// السعر "قبل الخصم" المعروض بخط مشطوب
export function strikePrice(p: PriceableProduct): number | null {
  if (isFlashActive(p)) return p.price;
  if (p.comparePrice && p.comparePrice > p.price) return p.comparePrice;
  return null;
}

// نسبة الخصم الحالية (من الفلاش أو مقارنة السعر)
export function currentDiscount(p: PriceableProduct): number {
  const strike = strikePrice(p);
  if (!strike || strike <= effectivePrice(p)) return 0;
  return Math.round((1 - effectivePrice(p) / strike) * 100);
}
