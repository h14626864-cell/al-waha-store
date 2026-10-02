/**
 * Seed script — متجر الواحة
 * يزرع بيانات واقعية: تصنيفات، منتجات، كوبونات، أدمن، وطلبات تجريبية
 * Usage: DATABASE_URL=file:/home/z/my-project/db/custom.db bun run scripts/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";

const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

// قراءة أول صورة من نتائج البحث، مع fallback
function img(key: string, fallback: string): string {
  const path = `/home/z/my-project/img_results/${key}.json`;
  try {
    if (existsSync(path)) {
      const data = JSON.parse(readFileSync(path, "utf-8"));
      if (data.success && data.results?.length > 0) return data.results[0].original_url;
    }
  } catch {}
  return fallback;
}

const FALLBACK = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80";

async function main() {
  console.log("🧹 تنظيف البيانات القديمة...");
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.coupon.deleteMany();
  await db.adminUser.deleteMany();

  console.log("📁 إنشاء التصنيفات...");
  const electronics = await db.category.create({
    data: {
      name: "إلكترونيات",
      slug: "electronics",
      description: "أحدث الأجهزة والإلكترونيات من أشهر الماركات العالمية",
      image: img("iphone", FALLBACK),
      sortOrder: 1,
    },
  });
  const fashion = await db.category.create({
    data: {
      name: "أزياء",
      slug: "fashion",
      description: "تشكيلة مختارة من أرقى الملابس والحقائب والأحذية",
      image: img("handbag", FALLBACK),
      sortOrder: 2,
    },
  });
  const home = await db.category.create({
    data: {
      name: "منزل ومطبخ",
      slug: "home-kitchen",
      description: "كل ما يحتاجه منزلك من أدوات وأجهزة وديكورات عصرية",
      image: img("cookware", FALLBACK),
      sortOrder: 3,
    },
  });
  const beauty = await db.category.create({
    data: {
      name: "عطور وتجميل",
      slug: "beauty",
      description: "عطور فاخرة ومستحضرات عناية أصلية 100%",
      image: img("oud", FALLBACK),
      sortOrder: 4,
    },
  });
  const watches = await db.category.create({
    data: {
      name: "ساعات وإكسسوارات",
      slug: "watches",
      description: "ساعات أنيقة وإكسسوارات تكمل إطلالتك",
      image: img("watch", FALLBACK),
      sortOrder: 5,
    },
  });

  console.log("🛍️ إضافة المنتجات...");
  const productsData = [
    {
      name: "آيفون 15 برو ماكس 256 جيجا",
      slug: "iphone-15-pro-max-256",
      brand: "Apple",
      description:
        "آيفون 15 برو ماكس بتيتانيوم خفيف وصلب، شاشة Super Retina XDR مقاس 6.7 بوصة بمعدل تحديث 120 هرتز، ومعالج A17 Pro الأسرع في فئته. كاميرا 48 ميجابكسل مع زووم بصري 5x وتصوير سينمائي 4K، وبطارية تدوم طول اليوم. متوفر بضمان الوكيل الرسمي لمدة سنة.",
      price: 64999,
      comparePrice: 69999,
      image: img("iphone", FALLBACK),
      categoryId: electronics.id,
      stock: 14,
      rating: 4.9,
      reviewsCount: 312,
      featured: true,
      isNew: true,
      soldCount: 187,
    },
    {
      name: "سماعات إيربودز برو الجيل الثاني",
      slug: "airpods-pro-2",
      brand: "Apple",
      description:
        "إيربودز برو 2 بشريحة H2 لعزل ضوضاء فوري أقوى بمرتين، وصوت مكاني مع تتبع حركة الرأس. علبة شحن MagSafe بعمر بطارية يصل إلى 30 ساعة، ومقاومة للعرق والماء بمعيار IP54. مثالية للمكالمات والموسيقى والرياضة.",
      price: 12499,
      comparePrice: 13999,
      image: img("airpods", FALLBACK),
      categoryId: electronics.id,
      stock: 32,
      rating: 4.8,
      reviewsCount: 204,
      featured: false,
      isNew: false,
      soldCount: 264,
    },
    {
      name: "لابتوب ماك بوك إير شريحة M3",
      slug: "macbook-air-m3",
      brand: "Apple",
      description:
        "ماك بوك إير 13 بوصة بشريحة M3 السوبر، رام 8 جيجا موحدة وقرص SSD بسعة 256 جيجا. شاشة Liquid Retina بألوان دقيقة وسطعة 500 nits، وتشغيل يصل إلى 18 ساعة بشحنة واحدة. تصميم نحيف بوزن 1.24 كجم فقط — رفيقك المثالي للعمل والدراسة.",
      price: 58999,
      comparePrice: null,
      image: img("macbook", FALLBACK),
      categoryId: electronics.id,
      stock: 8,
      rating: 4.9,
      reviewsCount: 141,
      featured: true,
      isNew: true,
      soldCount: 76,
    },
    {
      name: "شاشة سامسونج سمارت 55 بوصة 4K",
      slug: "samsung-55-4k-tv",
      brand: "Samsung",
      description:
        "شاشة سمارت تي في 55 بوصة بدقة 4K UHD وتقنية Crystal Processor لتحسين الصورة تلقائيًا. نظام Tizen الذكي مع كل التطبيقات (نتفليكس، يوتيوب، شاهد)، وصوت محيطي OTS Lite. 3 مداخل HDMI وبلوتوث لتوصيل كل أجهزتك.",
      price: 24500,
      comparePrice: 27000,
      image: img("tv", FALLBACK),
      categoryId: electronics.id,
      stock: 11,
      rating: 4.6,
      reviewsCount: 98,
      featured: true,
      isNew: false,
      soldCount: 92,
    },
    {
      name: "تيشيرت قطن رجالي أساسي",
      slug: "basic-cotton-tshirt",
      brand: "Local",
      description:
        "تيشيرت رجالي من القطن المصري الخالص بوزن 180 جرام — ملمس ناعم يتحمل الغسيل المتكرر دون تمدد أو بهتان لون. قصّة عصرية Regular Fit مناسبة لكل المناسبات اليومية. متوفر بألوان متعددة وقياسات من M إلى XXL.",
      price: 349,
      comparePrice: 499,
      image: img("tshirt", FALLBACK),
      categoryId: fashion.id,
      stock: 85,
      rating: 4.4,
      reviewsCount: 167,
      featured: false,
      isNew: false,
      soldCount: 341,
    },
    {
      name: "حقيبة يد نسائية جلد طبيعي",
      slug: "leather-women-handbag",
      brand: "Milano",
      description:
        "حقيبة يد أنيقة من الجلد الطبيعي المدبوغ يدويًا، بتصميم كلاسيكي يناسب العمل والمناسبات. جيوب داخلية متعددة وجيب مؤمن بسحاب للحاجيات الثمينة، مع حزام كتف قابل للفصل والتعديل. خياطة مزدوجة تضمن عمرًا طويلًا.",
      price: 1850,
      comparePrice: 2400,
      image: img("handbag", FALLBACK),
      categoryId: fashion.id,
      stock: 23,
      rating: 4.7,
      reviewsCount: 89,
      featured: true,
      isNew: false,
      soldCount: 118,
    },
    {
      name: "حذاء رياضي للجري والتمارين",
      slug: "running-sneakers",
      brand: "Nike",
      description:
        "حذاء رياضي بتقنية Foam المزدوجة لامتصاص الصدمات وارتداد مطاطي يمنحك خطوة أخف في الجري. شبكة تهوية علوية تحافظ على برودة القدم، ونعل مطاطي متين بقبضة قوية على كل الأسطح. خفيف الوزن — 280 جرام فقط للمقاس 42.",
      price: 3299,
      comparePrice: 3999,
      image: img("sneakers", FALLBACK),
      categoryId: fashion.id,
      stock: 40,
      rating: 4.8,
      reviewsCount: 213,
      featured: true,
      isNew: false,
      soldCount: 228,
    },
    {
      name: "عباية كلاسيك بقصة انسيابية",
      slug: "classic-abaya",
      brand: "Local",
      description:
        "عباية أنيقة من قماش النيدا الياباني الفاخر — خفيف، لا يشف، ويحافظ على انسداله طوال اليوم. قصّة انسيابية بأكمام واسعة وتفاصيل مطرزة يدويًا على الأكمام. متوفرة بالمقاسات 52 إلى 60، ومناسبة للاستخدام اليومي والمناسبات.",
      price: 899,
      comparePrice: null,
      image: img("abaya", FALLBACK),
      categoryId: fashion.id,
      stock: 47,
      rating: 4.5,
      reviewsCount: 64,
      featured: false,
      isNew: true,
      soldCount: 87,
    },
    {
      name: "طقم أواني طهي جرانيت 10 قطع",
      slug: "granite-cookware-set",
      brand: "Grandex",
      description:
        "طقم كامل من 10 قطع بطبقة جرانيت غير لاصقة خالية من مادة PFOA — طهي صحي بأقل كمية زيت. مقابض عازلة للحرارة وأغطية زجاجية مقواة بفتحة تصريف بخار. مناسب لكل أنواع المواقد بما فيها الإندكشن، وسهل التنظيف بمسحة واحدة.",
      price: 2750,
      comparePrice: 3500,
      image: img("cookware", FALLBACK),
      categoryId: home.id,
      stock: 19,
      rating: 4.6,
      reviewsCount: 143,
      featured: true,
      isNew: false,
      soldCount: 156,
    },
    {
      name: "ماكينة قهوة إسبريسو 20 بار",
      slug: "espresso-machine-20bar",
      brand: "DeLonghi",
      description:
        "ماكينة إسبريسو احترافية بمضخة إيطالية بضغط 20 بار لاستخلاص كريما غنية من حبوب البن أو الأكياس المعلبة. مبخّر حليب قوي لتحضير الكابتشينو واللاتيه برغوة مخملية، وخزان ماء 1.5 لتر قابل للفصل. تسخين سريع في 30 ثانية فقط.",
      price: 8499,
      comparePrice: 9800,
      image: img("espresso", FALLBACK),
      categoryId: home.id,
      stock: 12,
      rating: 4.7,
      reviewsCount: 77,
      featured: false,
      isNew: true,
      soldCount: 63,
    },
    {
      name: "مصباح طاولة خشبي عصري",
      slug: "modern-wooden-lamp",
      brand: "Nordic",
      description:
        "مصباح طاولة بتصميم إسكندنافي من خشب البلوط الطبيعي مع غطاء كتان يبعث إضاءة دافئة ومريحة للعين. مفتاح تشغيل على السلك مع إمكانية استخدام لمبات LED الذكية. لمسة دافئة تليق بغرفة النوم ومكتب الدراسة وصالة الاستقبال.",
      price: 649,
      comparePrice: 849,
      image: img("lamp", FALLBACK),
      categoryId: home.id,
      stock: 34,
      rating: 4.5,
      reviewsCount: 52,
      featured: false,
      isNew: false,
      soldCount: 94,
    },
    {
      name: "خلاط كهربائي 800 وات",
      slug: "blender-800w",
      brand: "Braun",
      description:
        "خلاط قوي بموتور 800 وات وشفرات ستانلس ستيل رباعية تطحن أسرع وأنعم — من عصائر الفواكه إلى المكسرات والثلج. إبريق زجاجي مقاوم للحرارة بسعة 1.5 لتر، مع 5 سرعات ووظيفة بلس للتحكم الدقيق. أجزاء قابلة للفصل وغسالة صحون آمنة.",
      price: 1999,
      comparePrice: null,
      image: img("blender", FALLBACK),
      categoryId: home.id,
      stock: 26,
      rating: 4.4,
      reviewsCount: 88,
      featured: false,
      isNew: false,
      soldCount: 132,
    },
    {
      name: "عطر عود ملكي فاخر 100 مل",
      slug: "royal-oud-perfume",
      brand: "Arabian Oud",
      description:
        "عطر شرقي فاخر يجمع العود الكمبودي الأصيل مع مزيج من الورد الطائفي والعنبر والمسك الأبيض. ثبات يصل إلى 12 ساعة وفوحان قوي يناسب المناسبات والسهرات. زجاجة فاخرة بتشطيب ذهبي تأتي في علبة هدايا أنيقة — مثالية للإهداء.",
      price: 2400,
      comparePrice: 2900,
      image: img("oud", FALLBACK),
      categoryId: beauty.id,
      stock: 28,
      rating: 4.9,
      reviewsCount: 176,
      featured: true,
      isNew: false,
      soldCount: 203,
    },
    {
      name: "سيروم فيتامين سي المركز 30 مل",
      slug: "vitamin-c-serum",
      brand: "The Ordinary",
      description:
        "سيروم بتركيز 20% فيتامين سي نقي مع حمض الهيالورونيك وفيتامين E — يوحّد لون البشرة ويفتح البقع الداكنة ويحفز إنتاج الكولاجين. تركيبة خفيفة تُمتص سريعًا بدون لزوجة، مناسبة لكل أنواع البشرة. استخدميه مساءً مع واقي شمس صباحًا.",
      price: 850,
      comparePrice: null,
      image: img("serum", FALLBACK),
      categoryId: beauty.id,
      stock: 55,
      rating: 4.6,
      reviewsCount: 231,
      featured: false,
      isNew: false,
      soldCount: 289,
    },
    {
      name: "طقم العناية بالبشرة 3 قطع",
      slug: "skincare-set-3pcs",
      brand: "Glow Lab",
      description:
        "روتين كامل من 3 خطوات: غسول لطيف برغوة كريمية، تونر مرطب بماء الورد، وكريم نهاري بواقي شمس SPF 30. مكونات طبيعية خالية من البارابين والعطور الصناعية، مناسبة للبشرة الحساسة. النتيجة: بشرة نظيفة، متوازنة، ومحمية طول اليوم.",
      price: 1150,
      comparePrice: 1450,
      image: img("skincare", FALLBACK),
      categoryId: beauty.id,
      stock: 31,
      rating: 4.7,
      reviewsCount: 119,
      featured: false,
      isNew: true,
      soldCount: 97,
    },
    {
      name: "ساعة أبل ووتش سيريس 9",
      slug: "apple-watch-series-9",
      brand: "Apple",
      description:
        "أبل ووتش سيريس 9 بشاشة Retina دائمية التشغيل بسطعة مضاعفة، وشريحة S9 الجديدة مع ميزة النقر المزدوج للتحكم بالإصبع. تتبع دقيق لمعدل النبض والأكسجين والنوم، ووضع تدريب لكل الرياضات. مقاومة للماء 50 متر وبطارية تدوم 18 ساعة.",
      price: 22999,
      comparePrice: 24999,
      image: img("smartwatch", FALLBACK),
      categoryId: watches.id,
      stock: 16,
      rating: 4.8,
      reviewsCount: 154,
      featured: true,
      isNew: true,
      soldCount: 111,
    },
    {
      name: "ساعة رجالية كلاسيك بسوار جلد",
      slug: "classic-leather-watch",
      brand: "Casio",
      description:
        "ساعة رجالية أنيقة بحركة كوارتز يابانية دقيقة وميناء أبيض بتفاصيل عربية مطبوعة. سوار جلد طبيعي مخيط يدويًا يكسب ملمسًا أجمل مع الزمن، وزجاج معدني مقاوم للخدش. مقاومة للماء 30 متر — إطلالة كلاسيكية تناسب الشغل والمناسبات.",
      price: 1450,
      comparePrice: 1750,
      image: img("watch", FALLBACK),
      categoryId: watches.id,
      stock: 38,
      rating: 4.5,
      reviewsCount: 71,
      featured: false,
      isNew: false,
      soldCount: 84,
    },
    {
      name: "نظارة شمسية أفياتور بولارايزد",
      slug: "aviator-sunglasses",
      brand: "Ray-Ban",
      description:
        "نظارة أفياتور أيقونية بعدسات بولارايزد تحجب الوهج وتوفر حماية UV400 كاملة من أشعة الشمس. إطار معدني خفيف مطلي ضد الصدأ، ووسائد أنف سيليكون مريحة. تأتي بعلبة أصلية وقطعة تنظيف — قطعة أساسية في إطلالة الصيف.",
      price: 2100,
      comparePrice: 2600,
      image: img("sunglasses", FALLBACK),
      categoryId: watches.id,
      stock: 44,
      rating: 4.6,
      reviewsCount: 93,
      featured: false,
      isNew: true,
      soldCount: 121,
    },
  ];

  for (const p of productsData) {
    await db.product.create({ data: p });
  }

  console.log("🎟️ إضافة الكوبونات...");
  await db.coupon.createMany({
    data: [
      { code: "WELCOME10", discountPercent: 10, active: true },
      { code: "WAHA15", discountPercent: 15, active: true },
      { code: "SALE20", discountPercent: 20, active: true },
    ],
  });

  console.log("👤 إنشاء حساب الأدمن...");
  await db.adminUser.create({
    data: {
      email: "admin@alwaha.com",
      password: sha256("admin123"),
      name: "مدير المتجر",
    },
  });

  console.log("📦 إنشاء طلبات تجريبية واقعية...");
  const allProducts = await db.product.findMany();
  const cities = ["القاهرة", "الجيزة", "الإسكندرية", "المنصورة", "أسيوط", "طنطا", "الزقازيق"];
  const names = ["أحمد محمود سالم", "مريم خالد عبد الله", "محمود السيد إبراهيم", "نورهان عادل حسن", "كريم طارق مصطفى", "سلمى ياسر الشريف", "عمر حسين فؤاد", "دعاء محمد رشاد", "يوسف عماد الدين", "هبة سامي قاسم"];
  const statuses = ["DELIVERED", "DELIVERED", "DELIVERED", "SHIPPED", "CONFIRMED", "PENDING", "DELIVERED", "CANCELLED", "SHIPPED", "DELIVERED"];
  const payments = ["COD", "COD", "VODAFONE_CASH", "COD", "COD"];

  for (let i = 0; i < 12; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(9 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);

    // اختيار 1-3 منتجات عشوائية
    const itemCount = 1 + Math.floor(Math.random() * 3);
    const shuffled = [...allProducts].sort(() => Math.random() - 0.5).slice(0, itemCount);
    const items = shuffled.map((p) => ({
      productId: p.id,
      productName: p.name,
      image: p.image,
      price: p.price,
      quantity: 1 + Math.floor(Math.random() * 2),
    }));

    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const shipping = subtotal >= 3000 ? 0 : 60;
    const useCoupon = i % 3 === 0;
    const discount = useCoupon ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
    const total = Math.round((subtotal + shipping - discount) * 100) / 100;

    await db.order.create({
      data: {
        orderNumber: `WH-25090${Math.floor(10 + i)}-${1000 + i * 137}`,
        customerName: names[i % names.length],
        phone: `010${Math.floor(10000000 + Math.random() * 89999999)}`,
        email: null,
        city: cities[i % cities.length],
        address: `شارع ${15 + i} القاهرة، عمارة ${3 + i}، الدور ${1 + (i % 6)}`,
        notes: i % 4 === 0 ? "يرجى الاتصال قبل التوصيل" : null,
        paymentMethod: payments[i % payments.length],
        status: statuses[i % statuses.length],
        subtotal,
        shipping,
        discount,
        total,
        couponCode: useCoupon ? "WELCOME10" : null,
        createdAt,
        items: { create: items },
      },
    });
  }

  const counts = {
    categories: await db.category.count(),
    products: await db.product.count(),
    coupons: await db.coupon.count(),
    orders: await db.order.count(),
  };
  console.log("✅ تم زرع البيانات بنجاح:", counts);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
