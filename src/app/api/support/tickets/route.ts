import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCustomerId } from "@/lib/customer-auth";

// توليد رقم تذكرة فريد
function generateTicketNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TK-${y}${m}${d}-${rand}`;
}

// إنشاء تذكرة دعم جديدة (مسجل أو زائر)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    const orderNumber = String(body.orderNumber || "").trim() || null;

    if (name.length < 3) {
      return NextResponse.json({ success: false, error: "أدخل الاسم" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "البريد الإلكتروني غير صحيح" }, { status: 400 });
    }
    if (subject.length < 5) {
      return NextResponse.json({ success: false, error: "اكتب موضوعًا واضحًا للمشكلة" }, { status: 400 });
    }
    if (message.length < 10) {
      return NextResponse.json({ success: false, error: "اشرح مشكلتك بالتفصيل (10 أحرف على الأقل)" }, { status: 400 });
    }

    const customerId = await getCustomerId();

    const ticket = await db.ticket.create({
      data: {
        ticketNumber: generateTicketNumber(),
        customerId: customerId || null,
        name,
        email,
        subject,
        orderNumber,
        messages: { create: { sender: "CUSTOMER", body: message } },
      },
    });

    return NextResponse.json({
      success: true,
      ticket: { ticketNumber: ticket.ticketNumber, id: ticket.id },
    });
  } catch (error) {
    console.error("Ticket POST error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء إنشاء التذكرة" }, { status: 500 });
  }
}

// تذاكر العميل المسجل
export async function GET() {
  try {
    const customerId = await getCustomerId();
    if (!customerId) {
      return NextResponse.json({ success: false, error: "غير مسجل الدخول" }, { status: 401 });
    }
    const tickets = await db.ticket.findMany({
      where: { customerId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    console.error("Tickets GET error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء تحميل التذاكر" }, { status: 500 });
  }
}
