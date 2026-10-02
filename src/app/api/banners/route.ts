import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// البانرات النشطة للواجهة العامة (حسب الموضع)
export async function GET() {
  try {
    const banners = await db.banner.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ success: true, banners });
  } catch (error) {
    console.error("Banners GET error:", error);
    return NextResponse.json({ success: false, banners: [] }, { status: 500 });
  }
}
