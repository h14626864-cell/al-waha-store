import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// إضافة رد من العميل على التذكرة
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const message = String(body.message || "").trim();

    if (message.length < 2) {
      return NextResponse.json({ success: false, error: "اكتب رسالتك" }, { status: 400 });
    }

    const ticket = await db.ticket.findUnique({ where: { ticketNumber: id } });
    if (!ticket) {
      return NextResponse.json({ success: false, error: "التذكرة غير موجودة" }, { status: 404 });
    }
    if (ticket.status === "CLOSED") {
      return NextResponse.json({ success: false, error: "التذكرة مقفولة — افتح تذكرة جديدة" }, { status: 400 });
    }

    const msg = await db.ticketMessage.create({
      data: { ticketId: ticket.id, sender: "CUSTOMER", body: message },
    });
    // إعادة فتح التذكرة إذا كان عليها رد وسأل العميل مرة أخرى
    await db.ticket.update({ where: { id: ticket.id }, data: { status: "OPEN" } });

    return NextResponse.json({ success: true, message: msg });
  } catch (error) {
    console.error("Ticket reply error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء إرسال الرد" }, { status: 500 });
  }
}
