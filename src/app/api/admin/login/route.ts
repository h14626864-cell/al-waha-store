import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { ADMIN_COOKIE, createSessionToken } from "@/lib/admin-auth";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email?.trim() || !password) {
      return NextResponse.json(
        { success: false, error: "أدخل البريد الإلكتروني وكلمة المرور" },
        { status: 400 }
      );
    }

    const admin = await db.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!admin || admin.password !== hashPassword(password)) {
      return NextResponse.json(
        { success: false, error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });

    response.cookies.set(ADMIN_COOKIE, createSessionToken(admin.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 });
  }
}
