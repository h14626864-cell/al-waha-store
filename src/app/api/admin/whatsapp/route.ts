import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";
import { sendWhatsApp, getWhatsAppConfig, isWhatsAppReady } from "@/lib/whatsapp";

// ===== اختبار إرسال واتساب من لوحة التحكم =====
export async function POST(request: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  try {
    const { to } = await request.json();
    if (!to || !String(to).trim()) {
      return NextResponse.json({ success: false, error: "اكتب رقم الموبايل للتجربة" }, { status: 400 });
    }
    const result = await sendWhatsApp(
      String(to).trim(),
      "رسالة تجريبية من متجرك ✅\nلو وصلتك الرسالة يبقى إشعارات واتساب شغالة تمام — كل تحديث شحنة هيوصل لعملائك هنا.",
      { orderNumber: "-", event: "TEST" }
    );
    return NextResponse.json({
      success: result.ok,
      provider: result.provider,
      to: result.to,
      error: result.error,
    });
  } catch (error) {
    console.error("WhatsApp test error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}

// ===== آخر محاولات الإرسال (لعرضها في اللوحة) =====
export async function GET() {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  const [logs, config] = await Promise.all([
    db.notificationLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    getWhatsAppConfig(),
  ]);
  return NextResponse.json({
    success: true,
    ready: isWhatsAppReady(config),
    provider: config.provider,
    logs: logs.map((l) => ({
      id: l.id,
      orderNumber: l.orderNumber,
      to: l.to,
      event: l.event,
      status: l.status,
      error: l.error,
      createdAt: l.createdAt,
    })),
  });
}
