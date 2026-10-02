import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

// كل المفاتيح المسموح تعديلها من لوحة التحكم
const ALLOWED_KEYS = [
  // الهوية
  "store_name",
  "store_name_en",
  "store_tagline",
  "store_logo",
  "store_email",
  "store_address",
  // التواصل
  "announcement",
  "support_phone",
  "store_whatsapp",
  // الشحن — أسعار لكل محافظة
  "shipping_rates",
  "shipping_fee",
  "free_shipping_threshold",
  // الدفع
  "card_payment_enabled",
  "cod_enabled",
  "vodafone_enabled",
  "card_on_delivery_enabled",
  "paymob_api_key",
  "paymob_card_integration_id",
  "paymob_iframe_id",
  "paymob_hmac_secret",
  // إشعارات واتساب
  "wa_provider",
  "wa_cloud_token",
  "wa_cloud_phone_id",
  "wa_ultramsg_instance",
  "wa_ultramsg_token",
  // البريد الإلكتروني (نظام السلات المتروكة والإيميلات)
  "email_provider",
  "email_resend_key",
  "email_smtp_host",
  "email_smtp_port",
  "email_smtp_user",
  "email_smtp_pass",
  "email_smtp_secure",
  "email_from_name",
  "email_from",
  "email_recovery_coupon",
  // السوشيال ميديا
  "social_facebook",
  "social_instagram",
  "social_tiktok",
  // مؤقت العروض
  "offers_countdown_end",
];

// المفاتيح السرية اللي بنقنّعها في العرض
const SECRET_KEYS = [
  "paymob_api_key",
  "paymob_hmac_secret",
  "wa_cloud_token",
  "wa_ultramsg_token",
  "email_resend_key",
  "email_smtp_pass",
];

function maskSecret(v: string): string {
  if (!v || v.length <= 12) return v ? "••••••••" : "";
  return v.slice(0, 6) + "••••••••" + v.slice(-4);
}

// قراءة كل الإعدادات (المفاتيح السرية تُقنّع جزئيًا)
export async function GET() {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  const settings = await db.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) {
    if (SECRET_KEYS.includes(s.key) && s.value) {
      map[s.key] = maskSecret(s.value);
    } else {
      map[s.key] = s.value;
    }
  }
  // حالة جاهزية بايموب للعرض في الواجهة
  const paymobReady = !!(
    map.paymob_api_key &&
    map.paymob_card_integration_id &&
    map.paymob_iframe_id
  );
  return NextResponse.json({ success: true, settings: map, paymobReady });
}

// حفظ الإعدادات (المفتاح المقنّع لا يتم تحديثه)
export async function PUT(request: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  try {
    const body = await request.json();
    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_KEYS.includes(key)) continue;
      const val = String(value ?? "").trim();
      // تجاهل القيم المقنّعة (الأدمن ما غيّرش المفتاح السري)
      if (SECRET_KEYS.includes(key) && val.includes("••••")) continue;
      await db.setting.upsert({
        where: { key },
        update: { value: val },
        create: { key, value: val },
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ success: false, error: "فشل حفظ الإعدادات" }, { status: 500 });
  }
}
