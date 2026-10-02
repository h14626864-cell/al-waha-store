import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";
import { sendEmail, abandonedCartEmailHtml, getEmailConfig } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import { normalizeWaPhone } from "@/lib/whatsapp";
import type { AbandonedCartItem } from "@/lib/types";

// ============================================================
// إرسال رابط إكمال الطلب لسلة متروكة بضغطة زر:
// body: { channel: "EMAIL" | "WHATSAPP" }
// EMAIL → إيميل عربي جميل فيه زر "أكمّل طلبك" (+ كوبون لو محدد في الإعدادات)
// WHATSAPP → رسالة واتساب بنفس المحتوى عبر مزود الإشعارات
// ============================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const channel = body.channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL";

    const cart = await db.abandonedCart.findUnique({ where: { id } });
    if (!cart) {
      return NextResponse.json({ success: false, error: "السلة غير موجودة" }, { status: 404 });
    }
    if (cart.status !== "OPEN") {
      return NextResponse.json({ success: false, error: "السلة مش مفتوحة (تم استرجاعها أو انتهت)" }, { status: 400 });
    }

    const config = await getEmailConfig();
    const storeName = config.storeName;
    const storeUrl = new URL(request.url).origin;
    const recoverUrl = `${storeUrl}/#/complete-cart?token=${cart.token}`;
    const items = (cart.items as unknown as AbandonedCartItem[]) || [];

    if (channel === "EMAIL") {
      if (!cart.email) {
        return NextResponse.json({ success: false, error: "العميل سيب الإيميل فاضي — جرّبي الإرسال بالواتساب" }, { status: 400 });
      }
      const result = await sendEmail({
        to: cart.email,
        subject: `سلتك مستنيك يا ${cart.customerName?.split(" ")[0] || "صديقنا"} — أكمل طلبك الآن 🛍️`,
        html: abandonedCartEmailHtml(
          { customerName: cart.customerName, items, subtotal: cart.subtotal },
          recoverUrl,
          storeName,
          config.recoveryCoupon || undefined
        ),
        template: "ABANDONED_CART",
        meta: { cartToken: cart.token },
      });
      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.error || "فشل إرسال الإيميل" }, { status: 400 });
      }
      await db.abandonedCart.update({
        where: { id },
        data: { remindersSent: { increment: 1 }, lastReminderAt: new Date(), lastChannel: "EMAIL" },
      });
      return NextResponse.json({ success: true, message: `تم إرسال لينك الإكمال على ${cart.email}` });
    }

    // واتساب
    if (!cart.phone) {
      return NextResponse.json({ success: false, error: "مفيش رقم هاتف للسلة دي" }, { status: 400 });
    }
    const waId = normalizeWaPhone(cart.phone);
    const lines = items
      .slice(0, 6)
      .map((i) => `• ${i.name}${i.size ? ` (مقاس ${i.size})` : ""}${i.color ? ` (${i.color})` : ""} × ${i.quantity}`)
      .join("\n");
    const msg =
      `مرحبًا ${cart.customerName?.split(" ")[0] || ""} 👋\n` +
      `سلتك في *${storeName}* مستنياك!\n\n${lines}\n\n` +
      `الإجمالي: *${cart.subtotal.toFixed(2)} ج.م*\n` +
      (config.recoveryCoupon ? `🎁 كود خصم: *${config.recoveryCoupon}*\n` : "") +
      `\nأكملي طلبك من هنا 👇\n${recoverUrl}`;
    const result = await sendWhatsApp(cart.phone, msg, { event: "ABANDONED_CART_REMINDER" });
    await db.abandonedCart.update({
      where: { id },
      data: { remindersSent: { increment: 1 }, lastReminderAt: new Date(), lastChannel: "WHATSAPP" },
    });
    // دايمًا بنرجّع لينك واتساب يدوي — الأدمن يقدر يبعتها بنفسه بضغطة لو المزود مش مفعّل
    const manualUrl = waId ? `https://wa.me/${waId}?text=${encodeURIComponent(msg)}` : null;
    return NextResponse.json({
      success: true,
      viaProvider: result.ok,
      message: result.ok ? "تم إرسال رسالة واتساب للعميل" : "افتحي المحادثة بضغطة وأرسلي الرسالة الجاهزة",
      manualUrl,
    });
  } catch (error) {
    console.error("Admin abandoned-cart send error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء الإرسال" }, { status: 500 });
  }
}
