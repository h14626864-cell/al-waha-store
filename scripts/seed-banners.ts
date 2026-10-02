// إضافة بيانات مبدئية للبانرات والإعدادات (تشغيل مرة واحدة)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("البانرات والإعدادات...");

  const bannerCount = await prisma.banner.count();
  if (bannerCount === 0) {
    await prisma.banner.createMany({
      data: [
        {
          title: "تخفيضات نهاية الأسبوع",
          subtitle: "خصومات تصل إلى 40% على الإلكترونيات المختارة",
          image: "/hero_banner1.png",
          link: "/category/electronics",
          ctaText: "تسوّق الآن",
          placement: "HERO",
          sortOrder: 1,
          active: true,
        },
        {
          title: "عرض العطور الفاخرة",
          subtitle: "عود شرقي ومستحضرات أصلية — اشتري 2 والثالثة مجانًا",
          image: "/hero_banner2.png",
          link: "/category/beauty",
          ctaText: "اكتشف العروض",
          placement: "HERO",
          sortOrder: 2,
          active: true,
        },
        {
          title: "عرض محدود: كود خصم SALE20 يوفرلك 20% على كل السلة",
          subtitle: "ساري على كل المنتجات لفترة محدودة",
          link: "/offers",
          placement: "STRIP",
          sortOrder: 1,
          active: true,
        },
        {
          title: "أزياء الموسم الجديد",
          subtitle: "تشكيلات حصرية وصلت للتو",
          image: "/category-fashion.jpg",
          link: "/category/fashion",
          ctaText: "تسوّق الأزياء",
          placement: "PROMO",
          sortOrder: 1,
          active: true,
        },
      ],
    });
    console.log("تم إنشاء 4 بانرات");
  } else {
    console.log(`البانرات موجودة بالفعل (${bannerCount})`);
  }

  // إعدادات افتراضية
  const defaults: Record<string, string> = {
    announcement: "شحن مجاني للطلبات فوق 3000 ج.م — توصيل لكل محافظات مصر",
    support_phone: "19999",
    card_payment_enabled: "true",
    cod_enabled: "true",
    vodafone_enabled: "true",
    card_on_delivery_enabled: "true",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  console.log("الإعدادات الافتراضية جاهزة");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
