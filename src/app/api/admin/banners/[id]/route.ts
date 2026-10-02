import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/admin-auth";

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
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.subtitle !== undefined) data.subtitle = String(body.subtitle).trim() || null;
    if (body.image !== undefined) data.image = String(body.image).trim() || null;
    if (body.link !== undefined) data.link = String(body.link).trim() || null;
    if (body.ctaText !== undefined) data.ctaText = String(body.ctaText).trim() || null;
    if (body.placement !== undefined && ["HERO", "STRIP", "PROMO"].includes(body.placement)) {
      data.placement = body.placement;
    }
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder) || 0;

    const banner = await db.banner.update({ where: { id }, data });
    return NextResponse.json({ success: true, banner });
  } catch (error) {
    console.error("Banner PUT error:", error);
    return NextResponse.json({ success: false, error: "فشل تحديث البانر" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  try {
    const { id } = await params;
    await db.banner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Banner DELETE error:", error);
    return NextResponse.json({ success: false, error: "فشل حذف البانر" }, { status: 500 });
  }
}
