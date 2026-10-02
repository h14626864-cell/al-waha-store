import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// تفاصيل تذكرة بالرقم (للمتابعة دون تسجيل دخول)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticket = await db.ticket.findUnique({
      where: { ticketNumber: id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket) {
      return NextResponse.json({ success: false, error: "التذكرة غير موجودة" }, { status: 404 });
    }
    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error("Ticket GET error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
