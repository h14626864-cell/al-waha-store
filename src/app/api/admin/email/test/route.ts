import { NextRequest, NextResponse } from "next/server";
import { getAdminId } from "@/lib/admin-auth";
import { sendEmail } from "@/lib/email";

// اختبار إعدادات البريد — يبعت إيميل تجريبي للأدمن
export async function POST(request: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const to = typeof body.to === "string" ? body.to.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ success: false, error: "اكتبي إيميل صحيح للاختبار" }, { status: 400 });
    }
    const result = await sendEmail({
      to,
      subject: "إيميل تجريبي من متجرك ✅",
      html: `<div style="font-family:Tahoma,Arial;direction:rtl;text-align:center;padding:30px;background:#f4f0e8;">
        <div style="background:#1E3A2B;color:#fff;border-radius:14px;max-width:420px;margin:0 auto;padding:28px;">
          <h2 style="margin:0 0 10px;">البريد شغّال بنجاح 🎉</h2>
          <p style="margin:0;font-size:14px;color:#d4af6a;">لو الإيميل ده وصلك، يبقى نظام البريد في متجرك جاهز لإرسال تأكيدات الطلبات وروابط السلات المتروكة.</p>
        </div>
      </div>`,
      template: "TEST",
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error || "فشل الإرسال" }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: "تم إرسال الإيميل التجريبي — راجعي صندوق الوارد" });
  } catch (error) {
    console.error("Email test error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
