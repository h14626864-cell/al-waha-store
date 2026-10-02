import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

export async function GET() {
  try {
    const adminId = await getAdminId();
    if (!adminId) {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }

    const [totalOrders, pendingOrders, deliveredOrders, cancelledOrders, totalProducts, lowStockProducts, revenueAgg, todayAgg, recentOrders, topProducts] =
      await Promise.all([
        db.order.count(),
        db.order.count({ where: { status: "PENDING" } }),
        db.order.count({ where: { status: "DELIVERED" } }),
        db.order.count({ where: { status: "CANCELLED" } }),
        db.product.count(),
        db.product.count({ where: { stock: { lte: 5 } } }),
        db.order.aggregate({ _sum: { total: true }, where: { status: { not: "CANCELLED" } } }),
        db.order.aggregate({
          _sum: { total: true },
          _count: true,
          where: {
            status: { not: "CANCELLED" },
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
        db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
        db.product.findMany({ orderBy: { soldCount: "desc" }, take: 5, select: { name: true, soldCount: true, price: true } }),
      ]);

    // مبيعات آخر 7 أيام للرسم البياني
    const salesByDay: { day: string; total: number }[] = [];
    const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const agg = await db.order.aggregate({
        _sum: { total: true },
        where: { status: { not: "CANCELLED" }, createdAt: { gte: date, lt: nextDate } },
      });
      salesByDay.push({
        day: dayNames[date.getDay()],
        total: Math.round((agg._sum.total || 0) * 100) / 100,
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        totalProducts,
        lowStockProducts,
        totalRevenue: revenueAgg._sum.total || 0,
        todayRevenue: todayAgg._sum.total || 0,
        todayOrders: todayAgg._count,
      },
      recentOrders,
      topProducts,
      salesByDay,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
