import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

// قائمة السلات المتروكة للوحة التحكم + إحصائيات سريعة + آخر إيميلات مرسلة
export async function GET(request: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  try {
    const status = new URL(request.url).searchParams.get("status") || "ALL";
    const where = status !== "ALL" ? { status } : {};

    const [carts, openCount, recoveredCount, expiredCount, recentEmails] = await Promise.all([
      db.abandonedCart.findMany({ where, orderBy: { updatedAt: "desc" }, take: 200 }),
      db.abandonedCart.count({ where: { status: "OPEN" } }),
      db.abandonedCart.count({ where: { status: "RECOVERED" } }),
      db.abandonedCart.count({ where: { status: "EXPIRED" } }),
      db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
    ]);

    // جاهزية الإرسال (لإظهار تنبيهات في الواجهة)
    const settings = await db.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    const emailProvider = map.email_provider || "none";
    const emailReady =
      (emailProvider === "resend" && !!(map.email_resend_key && map.email_from)) ||
      (emailProvider === "smtp" && !!(map.email_smtp_host && map.email_smtp_user && map.email_smtp_pass && map.email_from));
    const whatsappReady =
      (map.wa_provider === "cloud" && !!(map.wa_cloud_token && map.wa_cloud_phone_id)) ||
      (map.wa_provider === "ultramsg" && !!(map.wa_ultramsg_instance && map.wa_ultramsg_token));

    return NextResponse.json({
      success: true,
      carts,
      counts: { open: openCount, recovered: recoveredCount, expired: expiredCount },
      recentEmails,
      channels: { emailReady, whatsappReady, emailProvider },
    });
  } catch (error) {
    console.error("Admin abandoned-carts GET error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
