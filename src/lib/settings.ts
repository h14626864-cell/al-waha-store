// ============================================================
// إعدادات المتجر — قراءة مركزية من قاعدة البيانات مع قيم افتراضية
// ============================================================
import { db } from "@/lib/db";
import { parseShippingRates, rateForCity } from "@/lib/egypt";

export const SETTINGS_DEFAULTS: Record<string, string> = {
  // هوية المتجر (اسم ولوجو قابلين للتغيير من لوحة التحكم)
  store_name: "الواحة",
  store_name_en: "Al-Waha Store",
  store_tagline: "تسوق بثقة، توصيل سريع",
  store_logo: "", // رابط اللوجو — فاضي = اللوجو الافتراضي
  store_email: "support@alwaha-store.com",
  store_address: "٢٧ شارع التحرير، وسط البلد، القاهرة",

  // التواصل
  announcement: "شحن مجاني للطلبات فوق 3000 ج.م — توصيل لكل محافظات مصر",
  support_phone: "19999",
  store_whatsapp: "",

  // السوشيال ميديا (روابط كاملة)
  social_facebook: "",
  social_instagram: "",
  social_tiktok: "",

  // الشحن — سعر لكل محافظة + سعر افتراضي + حد الشحن المجاني
  shipping_rates: "", // JSON: { "القاهرة": 50, ... } — فاضي = الأسعار الافتراضية
  shipping_fee: "65", // السعر الافتراضي لأي محافظة غير محددة
  free_shipping_threshold: "3000",

  // طرق الدفع
  card_payment_enabled: "true",
  cod_enabled: "true",
  card_on_delivery_enabled: "true",
  vodafone_enabled: "false",
};

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany();
  const map: Record<string, string> = { ...SETTINGS_DEFAULTS };
  for (const r of rows) {
    if (r.value !== "" || SETTINGS_DEFAULTS[r.key] === "") map[r.key] = r.value;
  }
  return map;
}

// الإعدادات العامة (للزوار — بدون مفاتيح سرية)
export function publicSettings(map: Record<string, string>) {
  return {
    // الهوية
    store_name: map.store_name,
    store_name_en: map.store_name_en,
    store_tagline: map.store_tagline,
    store_logo: map.store_logo,
    store_email: map.store_email,
    store_address: map.store_address,
    // التواصل
    announcement: map.announcement,
    support_phone: map.support_phone,
    store_whatsapp: map.store_whatsapp || "",
    social_facebook: map.social_facebook || "",
    social_instagram: map.social_instagram || "",
    social_tiktok: map.social_tiktok || "",
    // مؤقت العروض التنازلي
    offers_countdown_end: map.offers_countdown_end || "",
    // الشحن
    shipping_fee: map.shipping_fee,
    free_shipping_threshold: map.free_shipping_threshold,
    shipping_rates: parseShippingRates(map.shipping_rates),
    // طرق الدفع المتاحة (بايموب يتطلب مفاتيح)
    card_payment_enabled:
      map.card_payment_enabled === "true" &&
      !!(map.paymob_api_key && map.paymob_card_integration_id && map.paymob_iframe_id),
    cod_enabled: map.cod_enabled === "true",
    card_on_delivery_enabled: map.card_on_delivery_enabled === "true",
    vodafone_enabled: map.vodafone_enabled === "true",
  };
}

// رسوم الشحن: سعر المحافظة المحددة أو الافتراضي — والشحن مجاني فوق الحد
export function calcShipping(
  subtotal: number,
  map: Record<string, string>,
  city?: string
): number {
  const threshold = Number(map.free_shipping_threshold) || 3000;
  if (subtotal <= 0) return 0;
  if (subtotal >= threshold) return 0;
  const defaultFee = Number(map.shipping_fee) || 65;
  return rateForCity(parseShippingRates(map.shipping_rates), city, defaultFee);
}
