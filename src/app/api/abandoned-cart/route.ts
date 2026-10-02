import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

// ============================================================
// السلات المتروكة:
// POST → التقاط سلة متروكة (اسم/هاتف/إيميل + عناصر السلة) من صفحة الدفع
// GET?token= → استرجاع السلة من لينك الإيميل (صالحة 48 ساعة)
// ============================================================

interface ItemInput {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
  variantId?: string;
  variantName?: string;
}

// بناء لقطة موثوقة من قاعدة البيانات (الاسم/الصورة/السعر من السيرفر — مش من العميل)
async function buildSnapshot(items: ItemInput[]) {
  const ids = [...new Set(items.map((i) => i.productId))].filter(Boolean);
  if (ids.length === 0) return { snapshot: [], subtotal: 0 };
  const products = await db.product.findMany({ where: { id: { in: ids } } });
  const map = new Map(products.map((p) => [p.id, p]));
  const snapshot: {
    productId: string; name: string; slug: string; image: string;
    price: number; quantity: number; size: string | null; color: string | null;
    variantId: string | null; variantName: string | null;
  }[] = [];
  let subtotal = 0;
  for (const item of items) {
    const p = map.get(item.productId);
    if (!p || p.stock <= 0) continue;
    const qty = Math.max(1, Math.min(Math.floor(item.quantity) || 1, p.stock));
    const size = item.size?.trim() ? item.size.trim().slice(0, 40) : null;
    const color = item.color?.trim() ? item.color.trim().slice(0, 40) : null;
    snapshot.push({
      productId: p.id,
      name: p.name,
      slug: p.slug,
      image: p.image,
      price: p.price,
      quantity: qty,
      size,
      color,
      variantId: item.variantId?.trim() || null,
      variantName: item.variantName?.trim() || null,
    });
    subtotal += p.price * qty;
  }
  return { snapshot, subtotal: Math.round(subtotal * 100) / 100 };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items: ItemInput[] = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "السلة فاضية" }, { status: 400 });
    }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validPhone = /^01[0-9]{9}$/.test(phone);
    if (!validEmail && !validPhone) {
      return NextResponse.json(
        { success: false, error: "لازم إيميل صحيح أو رقم هاتف مصري صحيح" },
        { status: 400 }
      );
    }

    const { snapshot, subtotal } = await buildSnapshot(items);
    if (snapshot.length === 0) {
      return NextResponse.json({ success: false, error: "المنتجات غير متاحة حاليًا" }, { status: 400 });
    }

    const data = {
      customerName: typeof body.customerName === "string" ? body.customerName.trim().slice(0, 120) || null : null,
      phone: phone || null,
      email: email || null,
      city: typeof body.city === "string" ? body.city.trim().slice(0, 60) || null : null,
      items: snapshot,
      subtotal,
    };

    // نفس العميل (بالايميل أو الهاتف) → نحدّث نفس السلة بدل تكرار صفوف
    let cart = validEmail
      ? await db.abandonedCart.findFirst({ where: { email, status: "OPEN" }, orderBy: { updatedAt: "desc" } })
      : null;
    if (!cart && validPhone) {
      cart = await db.abandonedCart.findFirst({ where: { phone, status: "OPEN" }, orderBy: { updatedAt: "desc" } });
    }

    if (cart) {
      await db.abandonedCart.update({ where: { id: cart.id }, data });
    } else {
      await db.abandonedCart.create({
        data: { ...data, token: randomBytes(18).toString("hex") },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("AbandonedCart POST error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء حفظ السلة" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) {
      return NextResponse.json({ success: false, error: "رابط غير صالح" }, { status: 400 });
    }
    const cart = await db.abandonedCart.findUnique({ where: { token } });
    if (!cart || cart.status !== "OPEN") {
      return NextResponse.json(
        { success: false, error: "السلة غير متاحة — ربما تم إكمال الطلب بالفعل" },
        { status: 404 }
      );
    }
    // صلاحية الرابط 48 ساعة
    const age = Date.now() - new Date(cart.updatedAt).getTime();
    if (age > 48 * 60 * 60 * 1000) {
      await db.abandonedCart.update({ where: { id: cart.id }, data: { status: "EXPIRED" } });
      return NextResponse.json(
        { success: false, error: "انتهت صلاحية الرابط — ابدأ التسوق من جديد" },
        { status: 410 }
      );
    }
    return NextResponse.json({ success: true, cart });
  } catch (error) {
    console.error("AbandonedCart GET error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
