// اختبار: ويبهوك بوسطة + إشعار واتساب + سجل الإشعارات
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const SECRET = (await db.setting.findUnique({ where: { key: "bosta_webhook_secret" } }))?.value || "";
const order = await db.order.findFirst({
  orderBy: { createdAt: "desc" },
  select: { orderNumber: true, shipmentStatus: true, status: true, phone: true, trackingNumber: true },
});

if (!order) {
    console.log("NO_ORDER");
    return;
  }
console.log("BEFORE:", JSON.stringify(order));

// نبعت حالة مختلفة عن الحالية عشان نحرك التحديث + الإشعار
const states = ["PACKAGE_PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];
const next = states.find((s) => s !== order.shipmentStatus) || "IN_TRANSIT";

const res = await fetch(
  `http://localhost:3000/api/shipping/bosta/webhook?key=${encodeURIComponent(SECRET)}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    delivery: {
      _id: order.trackingNumber || "test-shipment-id",
      trackingNumber: order.trackingNumber || "TEST-TRK-001",
      state: next,
      businessReference: order.orderNumber,
    },
  }),
});
console.log("WEBHOOK_STATUS:", res.status);
console.log("WEBHOOK_BODY:", JSON.stringify(await res.json()));

// تحقق من قاعدة البيانات
const after = await db.order.findUnique({
  where: { orderNumber: order.orderNumber },
  select: { shipmentStatus: true, status: true },
});
console.log("AFTER:", JSON.stringify(after));

// سجل الإشعارات
  const log = await db.notificationLog.findFirst({ orderBy: { createdAt: "desc" } });
  console.log("WA_LOG:", log ? JSON.stringify({
    orderNumber: log.orderNumber,
    to: log.to,
    event: log.event,
    status: log.status,
    error: log.error,
  }) : "NO_LOG");

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
