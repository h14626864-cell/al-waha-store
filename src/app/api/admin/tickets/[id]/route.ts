import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

// رد الأدمن على التذكرة أو تغيير حالتها
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const ticket = await db.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ success: false, error: "التذكرة غير موجودة" }, { status: 404 });
    }

    // إضافة رد من الأدمن
    if (body.reply?.trim()) {
      await db.ticketMessage.create({
        data: { ticketId: ticket.id, sender: "ADMIN", body: String(body.reply).trim() },
      });
      await db.ticket.update({ where: { id: ticket.id }, data: { status: "REPLIED" } });
    }

    // تغيير الحالة مباشرة
    if (body.status && ["OPEN", "REPLIED", "CLOSED"].includes(body.status)) {
      await db.ticket.update({ where: { id: ticket.id }, data: { status: body.status } });
    }

    const updated = await db.ticket.findUnique({
      where: { id: ticket.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json({ success: true, ticket: updated });
  } catch (error) {
    console.error("Admin ticket PUT error:", error);
    return NextResponse.json({ success: false, error: "فشل تحديث التذكرة" }, { status: 500 });
  }
}
