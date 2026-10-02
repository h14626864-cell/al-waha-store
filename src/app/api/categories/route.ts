import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("Categories GET error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تحميل التصنيفات" },
      { status: 500 }
    );
  }
}
