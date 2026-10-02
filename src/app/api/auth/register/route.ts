import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createCustomerToken, CUSTOMER_COOKIE } from "@/lib/customer-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    // التحقق من المدخلات
    if (name.length < 3) {
      return NextResponse.json({ success: false, error: "أدخل الاسم بالكامل (3 أحرف على الأقل)" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "البريد الإلكتروني غير صحيح" }, { status: 400 });
    }
    if (phone && !/^01[0-9]{9}$/.test(phone)) {
      return NextResponse.json({ success: false, error: "رقم الهاتف غير صحيح — يبدأ بـ 01 و 11 رقم" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
    }

    const existing = await db.customer.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, error: "هذا البريد مسجل بالفعل — سجّل الدخول" }, { status: 400 });
    }

    const customer = await db.customer.create({
      data: { name, email, phone: phone || null, password: hashPassword(password) },
    });

    const res = NextResponse.json({
      success: true,
      customer: { id: customer.id, name: customer.name, email: customer.email },
    });
    res.cookies.set(CUSTOMER_COOKIE, createCustomerToken(customer.id), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء التسجيل" }, { status: 500 });
  }
}
