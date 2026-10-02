import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCustomerId } from "@/lib/customer-auth";
import { getSettings, calcShipping } from "@/lib/settings";
import { effectivePrice } from "@/lib/pricing";
import { sendEmail, orderConfirmEmailHtml, adminNewOrderEmailHtml, getEmailConfig } from "@/lib/email";

type ProductWithPricing = {
  id: string; name: string; slug: string; image: string; price: number;
  comparePrice: number | null; salePrice: number | null; saleEndsAt: Date | null;
  stock: number; sizes: string[]; colors: unknown;
};

interface CartItemInput {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
  variantId?: string;
  variantName?: string;
}

interface OrderInput {
  customerName: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  notes?: string;
  paymentMethod: string;
  couponCode?: string;
  items: CartItemInput[];
}

// توليد رقم طلب فريد بشكل واقعي
function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `WH-${y}${m}${d}-${rand}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: OrderInput = await request.json();
    const { customerName, phone, email, city, address, notes, paymentMethod, couponCode } = body;

    // التحقق من الحقول المطلوبة
    if (!customerName?.trim() || !phone?.trim() || !city?.trim() || !address?.trim()) {
      return NextResponse.json(
        { success: false, error: "من فضلك أكمل جميع الحقول المطلوبة" },
        { status: 400 }
      );
    }
    if (!/^01[0-9]{9}$/.test(phone.trim())) {
      return NextResponse.json(
        { success: false, error: "رقم الهاتف غير صحيح — يجب أن يبدأ بـ 01 ويتكون من 11 رقم" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "سلة التسوق فارغة" },
        { status: 400 }
      );
    }

    // جلب المنتجات من قاعدة البيانات والتحقق من المخزون
    const productIds = body.items.map((i) => i.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const orderItemsData: {
      productId: string;
      productName: string;
      image: string;
      price: number;
      quantity: number;
      size: string | null;
      color: string | null;
    }[] = [];

    for (const item of body.items) {
      const product = productMap.get(item.productId) as ProductWithPricing | undefined;
      if (!product) {
        return NextResponse.json(
          { success: false, error: "أحد المنتجات غير موجود، حدّث السلة وحاول مرة أخرى" },
          { status: 400 }
        );
      }
      const qty = Math.max(1, Math.floor(item.quantity));
      if (product.stock < qty) {
        return NextResponse.json(
          { success: false, error: `الكمية المتاحة من "${product.name}" هي ${product.stock} فقط` },
          { status: 400 }
        );
      }
      // التحقق من المقاس واللون المختارين (لو المنتج فيه خيارات)
      const size = item.size?.trim() ? item.size.trim().slice(0, 40) : null;
      const color = item.color?.trim() ? item.color.trim().slice(0, 40) : null;
      if (size && product.sizes.length > 0 && !product.sizes.includes(size)) {
        return NextResponse.json(
          { success: false, error: `المقاس "${size}" غير متاح في "${product.name}"` },
          { status: 400 }
        );
      }
      const colorNames = Array.isArray(product.colors)
        ? (product.colors as { name?: string }[]).map((c) => String(c?.name || ""))
        : [];
      if (color && colorNames.length > 0 && !colorNames.includes(color)) {
        return NextResponse.json(
          { success: false, error: `اللون "${color}" غير متاح في "${product.name}"` },
          { status: 400 }
        );
      }
      orderItemsData.push({
        productId: product.id,
        productName: product.name,
        image: product.image,
        price: effectivePrice(product), // سعر الفلاش لو العرض شغّال — وإلا السعر العادي
        quantity: qty,
        size,
        color,
      });
    }

    // حساب الإجماليات (رسوم الشحن حسب محافظة العميل من إعدادات المتجر)
    const settings = await getSettings();
    const subtotal = orderItemsData.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = calcShipping(subtotal, settings, city);

    // التحقق من الكوبون
    let discount = 0;
    let appliedCoupon: string | null = null;
    if (couponCode?.trim()) {
      const coupon = await db.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });
      if (coupon && coupon.active) {
        discount = Math.round(subtotal * (coupon.discountPercent / 100) * 100) / 100;
        appliedCoupon = coupon.code;
      } else {
        return NextResponse.json(
          { success: false, error: "كود الخصم غير صالح أو منتهي" },
          { status: 400 }
        );
      }
    }

    const total = Math.round((subtotal + shipping - discount) * 100) / 100;

    // ربط الطلب بالعميل المسجل (إن وجد)
    const customerId = await getCustomerId();

    // إنشاء الطلب + خصم المخزون في معاملة واحدة
    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId: customerId || null,
          customerName: customerName.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
          city: city.trim(),
          address: address.trim(),
          notes: notes?.trim() || null,
          paymentMethod: paymentMethod || "COD",
          subtotal,
          shipping,
          discount,
          total,
          couponCode: appliedCoupon,
          items: { create: orderItemsData },
        },
        include: { items: true },
      });

      for (const item of orderItemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        });
      }

      return created;
    });

    // الإيميلات + تعليم السلات المتروكة كمسترجعة (خارج المعاملة — مش بتوقف الطلب)
    try {
      const origin = request.nextUrl.origin;
      const customerEmail = email?.trim().toLowerCase() || null;

      // سلة متروكة لنفس العميل → اتسترجعت
      await db.abandonedCart.updateMany({
        where: {
          status: "OPEN",
          OR: [
            ...(customerEmail ? [{ email: customerEmail }] : []),
            { phone: phone.trim() },
          ],
        },
        data: { status: "RECOVERED", recoveredOrderId: order.id },
      });

      // إيميل تأكيد للعميل + إشعار للأدمن (لو البريد مفعّل)
      if (customerEmail) {
        const plain = {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          total: order.total,
          shipping: order.shipping,
          subtotal: order.subtotal,
          discount: order.discount,
          city: order.city,
          address: order.address,
          paymentMethod: order.paymentMethod,
          items: order.items.map((i) => ({
            productName: i.productName,
            quantity: i.quantity,
            price: i.price,
            size: i.size,
            color: i.color,
          })),
        };
        await sendEmail({
          to: customerEmail,
          subject: `تأكيد طلبك ${order.orderNumber} — ${order.customerName.split(" ")[0]} شكرًا لك 🎉`,
          html: orderConfirmEmailHtml(plain, "متجر الواحة", origin),
          template: "ORDER_CONFIRM",
          meta: { orderNumber: order.orderNumber },
        });
      }
      // إشعار الأدمن بطلب جديد (لو البريد مفعّل ومحدد إيميل متجر)
      const emailConfig = await getEmailConfig();
      if (emailConfig.adminEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailConfig.adminEmail)) {
        await sendEmail({
          to: emailConfig.adminEmail,
          subject: `🛒 طلب جديد ${order.orderNumber} — ${order.total.toFixed(2)} ج.م`,
          html: adminNewOrderEmailHtml(
            {
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              phone: order.phone,
              city: order.city,
              address: order.address,
              total: order.total,
              paymentMethod: order.paymentMethod,
              items: order.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
            },
            emailConfig.storeName,
            origin
          ),
          template: "ADMIN_NEW_ORDER",
          meta: { orderNumber: order.orderNumber },
        });
      }
    } catch (mailErr) {
      console.error("Post-order side effects error:", mailErr);
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Order POST error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء إنشاء الطلب، حاول مرة أخرى" },
      { status: 500 }
    );
  }
}
