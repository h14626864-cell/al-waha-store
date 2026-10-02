// ============================================================
// نظام الإيميلات — بيدعم مزودين اثنين:
//   1) Resend (HTTP API — بدون مكتبات)
//   2) SMTP (Gmail أو أي سيرفر — عبر nodemailer)
// الإعدادات بتتخزن في جدول Setting وتتظبط من لوحة التحكم:
//   السلات المتروكة → إعدادات البريد
// كل محاولة إرسال بتتسجل في جدول EmailLog للمتابعة
// ============================================================
import { db } from "@/lib/db";

export interface EmailConfig {
  provider: string; // none | resend | smtp
  resendKey: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  fromName: string;
  fromEmail: string;
  storeName: string;
  adminEmail: string; // إيميل الإدمن للإشعارات
  recoveryCoupon: string; // كوبون يُدرج في إيميل استرجاع السلة (اختياري)
}

export async function getEmailConfig(): Promise<EmailConfig> {
  const settings = await db.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return {
    provider: map.email_provider || "none",
    resendKey: (map.email_resend_key || "").trim(),
    smtpHost: (map.email_smtp_host || "").trim(),
    smtpPort: (map.email_smtp_port || "587").trim(),
    smtpUser: (map.email_smtp_user || "").trim(),
    smtpPass: (map.email_smtp_pass || "").trim(),
    smtpSecure: map.email_smtp_secure === "true",
    fromName: (map.email_from_name || map.store_name || "المتجر").trim(),
    fromEmail: (map.email_from || "").trim(),
    storeName: map.store_name || "المتجر",
    adminEmail: (map.store_email || "").trim(),
    recoveryCoupon: (map.email_recovery_coupon || "").trim(),
  };
}

// فحص جاهزية البريد مع تفاصيل الناقص — عشان رسالة الخطأ تقول بالظبط إيه اللي ناقص
export function emailReadiness(c: EmailConfig): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!c.provider || c.provider === "none") {
    missing.push("اختيار المزود (Resend أو SMTP)");
  } else if (c.provider === "resend") {
    if (!c.resendKey) missing.push("مفتاح API من Resend");
    if (!c.fromEmail) missing.push('بريد المُرسل (from) — لو مفيش دومين مفعّل استخدمي onboarding@resend.dev');
  } else if (c.provider === "smtp") {
    if (!c.smtpHost) missing.push("سيرفر SMTP");
    if (!c.smtpUser) missing.push("اسم مستخدم SMTP");
    if (!c.smtpPass) missing.push("كلمة مرور SMTP");
    if (!c.fromEmail) missing.push("بريد المُرسل (from)");
  }
  return { ready: missing.length === 0, missing };
}

export function isEmailReady(c: EmailConfig): boolean {
  return emailReadiness(c).ready;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  template: string; // ORDER_CONFIRM | ADMIN_NEW_ORDER | ABANDONED_CART | TEST
  meta?: Record<string, string>;
}

export interface SendEmailResult {
  ok: boolean;
  provider: string;
  error?: string;
}

// إرسال إيميل + تسجيل النتيجة في EmailLog
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = await getEmailConfig();
  const log = async (status: string, error?: string) => {
    try {
      await db.emailLog.create({
        data: {
          to: input.to,
          subject: input.subject.slice(0, 200),
          template: input.template,
          status,
          error: error ? error.slice(0, 400) : null,
          meta: input.meta ? JSON.stringify(input.meta).slice(0, 500) : null,
        },
      });
    } catch (e) {
      console.error("[email] log error:", e);
    }
  };

  const readiness = emailReadiness(config);
  if (!readiness.ready) {
    const msg = `البريد ناقص إعداداته: ${readiness.missing.join(" • ")} — من لوحة التحكم: الإعدادات → تبويب البريد الإلكتروني، وبعدين اضغطي «حفظ كل الإعدادات»`;
    await log("SKIPPED", msg);
    return { ok: false, provider: config.provider, error: msg };
  }
  if (!input.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to.trim())) {
    await log("SKIPPED", "إيميل المستلم غير صالح");
    return { ok: false, provider: config.provider, error: "إيميل المستلم غير صالح" };
  }

  const from = `${config.fromName} <${config.fromEmail}>`;

  // ===== Resend =====
  if (config.provider === "resend") {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [input.to.trim()], subject: input.subject, html: input.html }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        const msg = data.message || `HTTP ${res.status}`;
        await log("FAILED", msg);
        return { ok: false, provider: "resend", error: msg };
      }
      await log("SENT");
      return { ok: true, provider: "resend" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطأ شبكة";
      await log("FAILED", msg);
      return { ok: false, provider: "resend", error: msg };
    }
  }

  // ===== SMTP (Gmail / Brevo / أي سيرفر) =====
  if (config.provider === "smtp") {
    try {
      const mod = await import("nodemailer");
      // توافق مع interop — nodemailer CJS فممكن يكون تحت default
      const nodemailer = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof import("nodemailer");
      const port = parseInt(config.smtpPort) || 587;
      // كلمة مرور التطبيقات في جيميل ساعات بتتلصق بمسافات — نشيلها
      const pass = config.smtpPass.replace(/\s+/g, "");
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port,
        secure: config.smtpSecure || port === 465,
        auth: { user: config.smtpUser.trim(), pass },
      });
      await transporter.sendMail({ from, to: input.to.trim(), subject: input.subject, html: input.html });
      await log("SENT");
      return { ok: true, provider: "smtp" };
    } catch (err) {
      const raw = err instanceof Error ? err.message : "خطأ في إرسال SMTP";
      // رسائل أوضح لأشهر أخطاء جيميل
      let msg = raw;
      if (/Invalid login|Username and Password not accepted|535/i.test(raw)) {
        msg = "جيميل رفض البيانات — اتأكدي إنك مستخدمة App Password (16 حرف) مش كلمة السر العادية، والتحقق بخطوتين مفعّل";
      } else if (/Expected response code|550|5-5\.1\.1/i.test(raw)) {
        msg = raw;
      }
      await log("FAILED", msg);
      return { ok: false, provider: "smtp", error: msg };
    }
  }

  await log("SKIPPED", "مزود غير معروف");
  return { ok: false, provider: config.provider, error: "مزود غير معروف" };
}

// ============================================================
// قوالب إيميل عربية RTL بتصميم متجر الواحة
// ============================================================
const WRAP = (title: string, body: string, storeName: string) => `
<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f0e8;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#1E3A2B;border-radius:16px 16px 0 0;padding:22px;text-align:center;">
    <h1 style="color:#ffffff;font-size:22px;margin:0;">${storeName}</h1>
    <p style="color:#d4af6a;font-size:12px;margin:6px 0 0;">تسوق بثقة، توصيل سريع</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 16px 16px;">
    <h2 style="color:#1E3A2B;font-size:18px;margin:0 0 14px;">${title}</h2>
    ${body}
  </div>
  <p style="color:#8a8a80;font-size:11px;text-align:center;margin:16px 0 0;">
    وصلتك هذه الرسالة لأنك تواصلت مع ${storeName} — إذا لم تكن أنت، تجاهل هذا الإيميل.
  </p>
</div>
</body></html>`;

const BTN = (href: string, label: string) => `
<table cellpadding="0" cellspacing="0" style="margin:18px auto;"><tr><td style="background:#1E3A2B;border-radius:12px;">
<a href="${href}" style="display:inline-block;padding:13px 30px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">${label}</a>
</td></tr></table>`;

// إيميل تأكيد الطلب للعميل
export function orderConfirmEmailHtml(
  order: { orderNumber: string; customerName: string; total: number; shipping: number; subtotal: number; discount: number; city: string; address: string; paymentMethod: string; items: { productName: string; quantity: number; price: number; size?: string | null; color?: string | null }[] },
  storeName: string,
  storeUrl: string
): string {
  const rows = order.items
    .map(
      (i) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;color:#333;">
        ${i.productName}${i.size ? ` — مقاس ${i.size}` : ""}${i.color ? ` — لون ${i.color}` : ""}
        <span style="color:#999;"> × ${i.quantity}</span>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;color:#333;text-align:left;white-space:nowrap;">${(i.price * i.quantity).toFixed(2)} ج.م</td>
    </tr>`
    )
    .join("");
  const method: Record<string, string> = {
    COD: "كاش عند الاستلام",
    CARD: "بطاقة بنكية",
    VODAFONE_CASH: "محفظة إلكترونية",
    CARD_ON_DELIVERY: "بطاقة عند الاستلام",
  };
  return WRAP(
    `شكرًا لطلبك يا ${order.customerName.split(" ")[0]} 🎉`,
    `
    <p style="font-size:14px;color:#444;line-height:1.9;margin:0 0 12px;">
      استلمنا طلبك بنجاح وسيتم تواصلك معك قريبًا لتأكيده.<br>
      رقم الطلب: <strong style="color:#1E3A2B;">${order.orderNumber}</strong>
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    <table width="100%" style="margin-top:10px;font-size:13px;color:#444;">
      <tr><td style="padding:4px 0;">المجموع الفرعي</td><td style="text-align:left;">${order.subtotal.toFixed(2)} ج.م</td></tr>
      <tr><td style="padding:4px 0;">الشحن — ${order.city}</td><td style="text-align:left;">${order.shipping === 0 ? "مجاني" : order.shipping.toFixed(2) + " ج.م"}</td></tr>
      ${order.discount > 0 ? `<tr><td style="padding:4px 0;color:#0a7d4f;">الخصم</td><td style="text-align:left;color:#0a7d4f;">-${order.discount.toFixed(2)} ج.م</td></tr>` : ""}
      <tr><td style="padding:8px 0;font-weight:bold;font-size:15px;border-top:2px solid #1E3A2B;">الإجمالي</td><td style="text-align:left;font-weight:bold;font-size:15px;color:#1E3A2B;border-top:2px solid #1E3A2B;">${order.total.toFixed(2)} ج.م</td></tr>
    </table>
    <p style="font-size:13px;color:#666;line-height:1.9;margin:14px 0 0;">
      العنوان: ${order.address} — ${order.city}<br>
      طريقة الدفع: ${method[order.paymentMethod] || order.paymentMethod}<br>
      يمكنك تتبع طلبك في أي وقت من الموقع.
    </p>
    ${BTN(`${storeUrl}/#/track?order=${order.orderNumber}`, "تتبع طلبك")}`,
    storeName
  );
}

// إشعار الإدمن بطلب جديد
export function adminNewOrderEmailHtml(
  order: { orderNumber: string; customerName: string; phone: string; city: string; address: string; total: number; paymentMethod: string; items: { productName: string; quantity: number }[] },
  storeName: string,
  storeUrl: string
): string {
  const itemsList = order.items.map((i) => `<li style="font-size:13px;color:#444;">${i.productName} × ${i.quantity}</li>`).join("");
  return WRAP(
    "طلب جديد وصل 🛒",
    `
    <p style="font-size:14px;color:#444;line-height:2;margin:0;">
      رقم الطلب: <strong>${order.orderNumber}</strong><br>
      العميل: <strong>${order.customerName}</strong><br>
      الهاتف: <strong dir="ltr">${order.phone}</strong><br>
      المحافظة: ${order.city}<br>
      العنوان: ${order.address}<br>
      الإجمالي: <strong style="color:#1E3A2B;">${order.total.toFixed(2)} ج.م</strong><br>
      الدفع: ${order.paymentMethod}
    </p>
    <ul style="margin:12px 0 0;padding-start:20px;">${itemsList}</ul>
    ${BTN(`${storeUrl}/#/admin`, "فتح لوحة التحكم")}`,
    storeName
  );
}

// إيميل استرجاع السلة المتروكة
export function abandonedCartEmailHtml(
  cart: { customerName?: string | null; items: { name: string; image?: string; price: number; quantity: number; size?: string; color?: string }[]; subtotal: number },
  recoverUrl: string,
  storeName: string,
  couponCode?: string
): string {
  const rows = cart.items
    .slice(0, 6)
    .map(
      (i) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">
        <table cellpadding="0" cellspacing="0"><tr>
          ${i.image ? `<td style="padding-left:12px;"><img src="${i.image}" width="52" height="52" alt="" style="border-radius:8px;display:block;"></td>` : ""}
          <td style="font-size:13px;color:#333;">
            ${i.name}${i.size ? ` — مقاس ${i.size}` : ""}${i.color ? ` — لون ${i.color}` : ""}
            <br><span style="color:#999;">${i.quantity} × ${i.price.toFixed(2)} ج.م</span>
          </td>
        </tr></table>
      </td>
    </tr>`
    )
    .join("");
  return WRAP(
    `سلتك مستنيك يا ${cart.customerName?.split(" ")[0] || "صديقنا"} 🛍️`,
    `
    <p style="font-size:14px;color:#444;line-height:1.9;margin:0 0 14px;">
      حجزنالك المنتجات اللي اخترتها — بس لسه مكملتش الطلب!<br>
      اضغط الزر ده وهتلاقي سلتك جاهزة زي ما هي، كمّل طلبك في أقل من دقيقة.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    <p style="font-size:15px;color:#1E3A2B;font-weight:bold;text-align:center;margin:16px 0 0;">
      إجمالي سلتك: ${cart.subtotal.toFixed(2)} ج.م
    </p>
    ${BTN(recoverUrl, "أكمّل طلبك الآن")}
    ${couponCode ? `<p style="text-align:center;font-size:13px;color:#8a6d1f;background:#fdf6e3;border:1px dashed #d4af6a;border-radius:10px;padding:10px;margin:6px 0 0;">🎁 استخدم كود <strong>${couponCode}</strong> واحصل على خصم إضافي عند إتمام طلبك</p>` : ""}
    <p style="font-size:12px;color:#999;text-align:center;margin:14px 0 0;">الرابط صالح لمدة 48 ساعة</p>`,
    storeName
  );
}
