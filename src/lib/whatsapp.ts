// ============================================================
// إشعارات واتساب للعملاء — بترسل تلقائيًا لما حالة الشحنة/الطلب تتغير
// بتدعم مزودين اثنين:
//   1) WhatsApp Cloud API — الرسمي من Meta (graph.facebook.com)
//   2) UltraMsg — بديل سريع بدون مراجعة أعمال (api.ultramsg.com)
// الإعدادات والتفعيل من لوحة التحكم → الإعدادات → الإشعارات والعروض
// كل محاولة إرسال بتتسجل في جدول NotificationLog لمتابعتها من اللوحة
// ============================================================
import { db } from "@/lib/db";

export interface WhatsAppConfig {
  provider: string; // none | cloud | ultramsg
  cloudToken: string;
  cloudPhoneId: string;
  ultramsgInstance: string;
  ultramsgToken: string;
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const settings = await db.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return {
    provider: map.wa_provider || "none",
    cloudToken: (map.wa_cloud_token || "").trim(),
    cloudPhoneId: (map.wa_cloud_phone_id || "").trim(),
    ultramsgInstance: (map.wa_ultramsg_instance || "").trim(),
    ultramsgToken: (map.wa_ultramsg_token || "").trim(),
  };
}

export function isWhatsAppReady(c: WhatsAppConfig): boolean {
  if (c.provider === "cloud") return !!(c.cloudToken && c.cloudPhoneId);
  if (c.provider === "ultramsg") return !!(c.ultramsgInstance && c.ultramsgToken);
  return false;
}

// توحيد صيغة رقم الموبايل للواتساب (الواتساب بيطلب كود الدولة بدون +)
// مصر: 01012345678 → 201012345678
export function normalizeWaPhone(phone: string): string | null {
  let d = (phone || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  // أرقام محلية تبدأ بصفر (مصر) → كود الدولة 20
  if (d.startsWith("0")) d = "20" + d.slice(1);
  // حدود معقولة لأرقام واتساب
  if (d.length < 10 || d.length > 15) return null;
  return d;
}

export interface WhatsAppSendResult {
  ok: boolean;
  provider: string;
  to: string | null;
  error?: string;
}

export interface WhatsAppLogOpts {
  orderId?: string;
  orderNumber?: string;
  event?: string; // SHIPMENT_UPDATE | ORDER_STATUS | SHIPMENT_CREATED | TEST
}

// إرسال رسالة واتساب + تسجيل النتيجة في قاعدة البيانات
export async function sendWhatsApp(
  to: string,
  message: string,
  opts?: WhatsAppLogOpts
): Promise<WhatsAppSendResult> {
  const config = await getWhatsAppConfig();
  const ready = isWhatsAppReady(config);
  const waId = normalizeWaPhone(to);

  const log = async (status: string, error?: string) => {
    try {
      await db.notificationLog.create({
        data: {
          orderId: opts?.orderId || undefined,
          orderNumber: opts?.orderNumber || "-",
          to: waId || to || "-",
          event: opts?.event || "NOTIFY",
          message,
          status,
          error: error ? error.slice(0, 400) : null,
        },
      });
    } catch (e) {
      console.error("[whatsapp] log error:", e);
    }
  };

  if (!ready) {
    await log("SKIPPED", "الإشعارات غير مفعلة — أضيفي بيانات واتساب من الإعدادات");
    return { ok: false, provider: config.provider, to: waId, error: "الإشعارات غير مفعلة" };
  }
  if (!waId) {
    await log("SKIPPED", "رقم هاتف غير صالح");
    return { ok: false, provider: config.provider, to: null, error: "رقم غير صالح" };
  }

  // ===== WhatsApp Cloud API (Meta الرسمي) =====
  if (config.provider === "cloud") {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${config.cloudPhoneId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.cloudToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: waId,
            type: "text",
            text: { preview_url: true, body: message },
          }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok || data?.error) {
        const msg = data?.error?.message || `HTTP ${res.status}`;
        console.error("[whatsapp] cloud send failed:", msg);
        await log("FAILED", msg);
        return { ok: false, provider: "cloud", to: waId, error: msg };
      }
      await log("SENT");
      return { ok: true, provider: "cloud", to: waId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطأ شبكة";
      console.error("[whatsapp] cloud network error:", err);
      await log("FAILED", msg);
      return { ok: false, provider: "cloud", to: waId, error: msg };
    }
  }

  // ===== UltraMsg =====
  if (config.provider === "ultramsg") {
    try {
      const res = await fetch(
        `https://api.ultramsg.com/${encodeURIComponent(config.ultramsgInstance)}/messages/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: config.ultramsgToken,
            to: waId,
            body: message,
          }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        sent?: boolean | string;
        error?: string;
        message?: string;
        id?: string;
      };
      const sent = data?.sent === true || data?.sent === "true";
      if (!res.ok || !sent) {
        const msg = data?.error || data?.message || `HTTP ${res.status}`;
        console.error("[whatsapp] ultramsg send failed:", msg);
        await log("FAILED", msg);
        return { ok: false, provider: "ultramsg", to: waId, error: msg };
      }
      await log("SENT");
      return { ok: true, provider: "ultramsg", to: waId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطأ شبكة";
      console.error("[whatsapp] ultramsg network error:", err);
      await log("FAILED", msg);
      return { ok: false, provider: "ultramsg", to: waId, error: msg };
    }
  }

  await log("SKIPPED", "مزود غير معروف");
  return { ok: false, provider: config.provider, to: waId, error: "مزود غير معروف" };
}

// ============================================================
// بناء رسائل عربية جميلة للعميل
// ============================================================

interface NotifyOrder {
  orderNumber: string;
  customerName: string;
  phone: string;
  status?: string;
}

async function storeInfo(): Promise<{ name: string; phone: string }> {
  const settings = await db.setting.findMany({
    where: { key: { in: ["store_name", "support_phone"] } },
  });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return { name: map.store_name || "المتجر", phone: map.support_phone || "" };
}

function statusArabic(status: string): string {
  const map: Record<string, string> = {
    PENDING: "بانتظار التأكيد",
    CONFIRMED: "تم تأكيد الطلب",
    SHIPPED: "تم شحن الطلب",
    DELIVERED: "تم توصيل الطلب",
    CANCELLED: "تم إلغاء الطلب",
  };
  return map[status] || status;
}

// إشعار بتغير حالة الطلب من لوحة التحكم
export async function notifyOrderStatus(order: NotifyOrder, newStatus: string) {
  const info = await storeInfo();
  const first = (order.customerName || "عميلنا العزيز").split(" ")[0];
  const isCancelled = newStatus === "CANCELLED";
  const msg =
    `مرحبًا ${first} 👋\n` +
    `تحديث بخصوص طلبك رقم *${order.orderNumber}* من *${info.name}*:\n\n` +
    `${isCancelled ? "⚠️" : "✅"} حالة الطلب: *${statusArabic(newStatus)}*\n` +
    (isCancelled
      ? `\nلو ده كان بالغلط أو عندك أي استفسار، كلمنا على طول`
      : `\nشكرًا لثقتك فينا 💚`) +
    (info.phone ? `\nلأي استفسار: ${info.phone}` : "");
  return sendWhatsApp(order.phone, msg, {
    orderNumber: order.orderNumber,
    event: "ORDER_STATUS",
  });
}
