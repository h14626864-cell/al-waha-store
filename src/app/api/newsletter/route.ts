import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// اشتراك النشرة البريدية من الفوتر
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "اكتب بريدًا إلكترونيًا صحيحًا" }, { status: 400 });
    }
    await db.subscriber.upsert({
      where: { email },
      update: {},
      create: { email },
    });
    return NextResponse.json({ success: true, message: "تم الاشتراك — استقبلي أحدث العروض أول بأول 🎉" });
  } catch (error) {
    console.error("Newsletter POST error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
