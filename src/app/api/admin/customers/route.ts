import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

// قائمة العملاء المسجلين مع عدد طلباتهم وإجمالي إنفاقهم
export async function GET() {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  const customers = await db.customer.findMany({
    include: {
      orders: { select: { total: true, status: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = customers.map((c) => {
    const paid = c.orders.filter((o) => o.status !== "CANCELLED");
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      createdAt: c.createdAt,
      ordersCount: c._count.orders,
      totalSpent: paid.reduce((s, o) => s + o.total, 0),
    };
  });

  return NextResponse.json({ success: true, customers: result });
}
