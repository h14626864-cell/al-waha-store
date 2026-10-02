// ============================================================
// بوابة دفع Paymob — تكامل حقيقي بالـ API الرسمي
// التسلسل: auth token → إنشاء أوردر → payment key → رابط iframe
// التوثيق: https://developers.paymob.com/accept/accept-standard-redirect-flow
// ============================================================

import crypto from "crypto";

const PAYMOB_BASE = "https://accept.paymob.com/api";

export interface PaymobKeys {
  apiKey: string;
  cardIntegrationId: string;
  iframeId: string;
  hmacSecret: string;
}

export interface PaymobBilling {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  building?: string;
  floor?: string;
  apartment?: string;
  postalCode?: string;
}

// تقسيم الاسم العربي لاسم وأخير (بايموب بياخد اسمين)
export function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

// 1) الحصول على auth token (صالح لمدة ساعة)
export async function getAuthToken(apiKey: string): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    const msg = data?.detail || data?.message || "مفاتيح بايموب غير صحيحة";
    throw new Error(`فشل الاتصال ببايموب: ${msg}`);
  }
  return data.token as string;
}

// 2) إنشاء أوردر في بايموب
export async function createPaymobOrder(opts: {
  authToken: string;
  amountCents: number;
  merchantOrderId: string;
  items?: { name: string; amountCents: number; quantity: number }[];
}): Promise<number> {
  const res = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: opts.authToken,
      delivery_needed: false,
      amount_cents: opts.amountCents,
      currency: "EGP",
      merchant_order_id: opts.merchantOrderId,
      items: (opts.items || []).map((i) => ({
        name: String(i.name).slice(0, 128),
        amount_cents: i.amountCents,
        description: "منتج من المتجر",
        quantity: i.quantity,
      })),
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.id) {
    const msg = data?.detail || data?.message || JSON.stringify(data).slice(0, 200);
    throw new Error(`فشل إنشاء الطلب في بايموب: ${msg}`);
  }
  return data.id as number;
}

// 3) إنشاء payment key
export async function createPaymentKey(opts: {
  authToken: string;
  amountCents: number;
  paymobOrderId: number;
  integrationId: string;
  billing: PaymobBilling;
}): Promise<string> {
  const b = opts.billing;
  const res = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: opts.authToken,
      amount_cents: opts.amountCents,
      expiration: 3600,
      order_id: opts.paymobOrderId,
      currency: "EGP",
      integration_id: Number(opts.integrationId),
      billing_data: {
        first_name: b.firstName,
        last_name: b.lastName,
        email: b.email || "customer@store.eg",
        phone_number: b.phone,
        apartment: b.apartment || "NA",
        floor: b.floor || "NA",
        street: b.street || "NA",
        building: b.building || "NA",
        shipping_method: "NA",
        postal_code: b.postalCode || "NA",
        city: b.city || "Cairo",
        country: "EG",
        state: b.state || b.city || "Cairo",
      },
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    const msg = data?.detail || data?.message || JSON.stringify(data).slice(0, 200);
    throw new Error(`فشل إنشاء مفتاح الدفع: ${msg}`);
  }
  return data.token as string;
}

// 4) رابط صفحة الدفع (iframe)
export function buildIframeUrl(iframeId: string, paymentKeyToken: string): string {
  return `${PAYMOB_BASE}/acceptance/iframes/${iframeId}?payment_token=${paymentKeyToken}`;
}

// التحقق من توقيع HMAC لمعاملة بايموب (SHA-512)
// الحقول بالترتيب المطلوب حسب توثيق بايموب الرسمي
export function verifyPaymobHmac(
  obj: Record<string, unknown>,
  hmacSecret: string,
  receivedHmac: string
): boolean {
  if (!hmacSecret || !receivedHmac) return false;

  const source = (obj.source_data || {}) as Record<string, unknown>;
  const order = (obj.order || {}) as Record<string, unknown>;

  const concatenated = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    obj.integration_id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    order.id,
    obj.owner,
    obj.pending,
    source.pan,
    source.sub_type,
    source.type,
    obj.success,
  ]
    .map((v) => (v === null || v === undefined ? "" : String(v)))
    .join("");

  const computed = crypto
    .createHmac("sha512", hmacSecret)
    .update(concatenated)
    .digest("hex");

  return computed === receivedHmac.toLowerCase();
}

// قراءة مفاتيح بايموب من الإعدادات
export async function getPaymobKeys(): Promise<PaymobKeys | null> {
  const { db } = await import("@/lib/db");
  const settings = await db.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  const apiKey = (map["paymob_api_key"] || "").trim();
  const cardIntegrationId = (map["paymob_card_integration_id"] || "").trim();
  const iframeId = (map["paymob_iframe_id"] || "").trim();
  const hmacSecret = (map["paymob_hmac_secret"] || "").trim();

  if (!apiKey || !cardIntegrationId || !iframeId) return null;
  return { apiKey, cardIntegrationId, iframeId, hmacSecret };
}

// هل بايموب مفعّل؟
export async function isPaymobConfigured(): Promise<boolean> {
  return (await getPaymobKeys()) !== null;
}
