import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

export async function GET() {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  const banners = await db.banner.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ success: true, banners });
}

export async function POST(request: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    if (title.length < 2) {
      return NextResponse.json({ success: false, error: "أدخل عنوان البانر" }, { status: 400 });
    }
    const banner = await db.banner.create({
      data: {
        title,
        subtitle: String(body.subtitle || "").trim() || null,
        image: String(body.image || "").trim() || null,
        link: String(body.link || "").trim() || null,
        ctaText: String(body.ctaText || "").trim() || null,
        placement: ["HERO", "STRIP", "PROMO"].includes(body.placement) ? body.placement : "HERO",
        active: body.active !== false,
        sortOrder: parseInt(body.sortOrder) || 0,
      },
    });
    return NextResponse.json({ success: true, banner });
  } catch (error) {
    console.error("Banner POST error:", error);
    return NextResponse.json({ success: false, error: "فشل إنشاء البانر" }, { status: 500 });
  }
}
