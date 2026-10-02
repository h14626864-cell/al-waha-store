// ============================================================
// محافظات مصر الـ 27 — مستخدمة في صفحة الدفع وأسعار الشحن
// ============================================================

export const GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "القليوبية",
  "الشرقية",
  "الدقهلية",
  "المنوفية",
  "الغربية",
  "البحيرة",
  "كفر الشيخ",
  "دمياط",
  "بورسعيد",
  "الإسماعيلية",
  "السويس",
  "الفيوم",
  "بني سويف",
  "المنيا",
  "أسيوط",
  "سوهاج",
  "قنا",
  "الأقصر",
  "أسوان",
  "البحر الأحمر",
  "الوادي الجديد",
  "مطروح",
  "شمال سيناء",
  "جنوب سيناء",
] as const;

// الأسعار الافتراضية لكل محافظة (ج.م) — بتتظبط من لوحة التحكم
export const DEFAULT_SHIPPING_RATES: Record<string, number> = {
  "القاهرة": 50,
  "الجيزة": 50,
  "القليوبية": 55,
  "الإسكندرية": 60,
  "الدقهلية": 60,
  "الشرقية": 60,
  "المنوفية": 60,
  "الغربية": 60,
  "البحيرة": 65,
  "كفر الشيخ": 65,
  "دمياط": 65,
  "بورسعيد": 65,
  "الإسماعيلية": 65,
  "السويس": 65,
  "الفيوم": 65,
  "بني سويف": 65,
  "المنيا": 70,
  "أسيوط": 70,
  "سوهاج": 70,
  "قنا": 70,
  "الأقصر": 75,
  "أسوان": 75,
  "البحر الأحمر": 90,
  "الوادي الجديد": 90,
  "مطروح": 90,
  "شمال سيناء": 90,
  "جنوب سيناء": 90,
};

// قراءة جدول الأسعار من إعداد shipping_rates (JSON) مع fallback للأفتراضي
export function parseShippingRates(json: string | undefined): Record<string, number> {
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const clean: Record<string, number> = {};
        for (const gov of GOVERNORATES) {
          const v = Number(parsed[gov]);
          if (!isNaN(v) && v >= 0) clean[gov] = v;
        }
        return clean;
      }
    } catch {
      // JSON غير صالح → نرجع الافتراضي
    }
  }
  return { ...DEFAULT_SHIPPING_RATES };
}

// سعر الشحن لمحافظة معينة (مع سعر افتراضي عام للمحافظات غير المسعرة)
export function rateForCity(
  rates: Record<string, number>,
  city: string | undefined | null,
  fallbackFee: number
): number {
  if (!city) return fallbackFee;
  const v = rates[city.trim()];
  return typeof v === "number" && v >= 0 ? v : fallbackFee;
}
