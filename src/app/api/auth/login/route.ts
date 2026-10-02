import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createCustomerToken, CUSTOMER_COOKIE } from "@/lib/customer-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "أدخل البريد وكلمة المرور" }, { status: 400 });
    }

    const customer = await db.customer.findUnique({ where: { email } });
    if (!customer || !verifyPassword(password, customer.password)) {
      return NextResponse.json({ success: false, error: "البريد أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

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
    console.error("Login error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 });
  }
}
