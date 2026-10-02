# نشر المشروع على Vercel مع قاعدة بيانات Neon

## اللي اتعمل في المشروع عشان يبقى جاهز لـ Vercel
- تغيير قاعدة البيانات من SQLite لـ PostgreSQL (Neon) في `prisma/schema.prisma`.
- تبسيط أوامر `package.json` (شيلنا الأوامر الخاصة بـ bun/Caddy وسيبنا next العادي).
- شيل `output: "standalone"` من `next.config.ts` لأنه مش لازم على Vercel.
- شيل ملفات التطوير اللي مالهاش لازمة في الديبلوي (screenshots, scripts تجريبية, ملف db المحلي).
- عمل `.env.example` فيه المتغيرات المطلوبة.

## خطوة 1: ارفع المشروع على GitHub
```bash
# فك ضغط الملف اللي نزلته، بعدين جوه المجلد:
git remote add origin <رابط الريبو بتاعك على GitHub>
git branch -M main
git push -u origin main
```
(الريبو أصلاً فيه git init وأول commit، محتاج بس تربطه بريبو GitHub وترفعه)

## خطوة 2: اعمل قاعدة بيانات Neon
1. روح https://console.neon.tech واعمل مشروع جديد (أو من داخل Vercel: Storage > Create Database > Neon).
2. هتلاقي Connection String بشكلين: واحد pooled (فيه `-pooler` في العنوان) وواحد direct.
3. لو عملتها من تكامل Vercel x Neon، هيتحطلك المتغيرات دي تلقائي باسم `DATABASE_URL` و `DATABASE_URL_UNPOOLED` (أو `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING`).

## خطوة 3: اربط المشروع بـ Vercel
1. من https://vercel.com اعمل Add New > Project واختار الريبو.
2. Vercel هيكتشف إنه Next.js تلقائي.
3. في Environment Variables ضيف:
   - `DATABASE_URL` = الـ connection string الـ pooled
   - `DIRECT_URL` = الـ connection string الـ direct (non-pooling)
   - `ADMIN_SECRET` = قيمة سرية عشوائية طويلة (لتوقيع جلسات الأدمن/العميل)
   - أي متغيرات تانية كانت شغالة عندك زي بيانات Paymob أو WhatsApp/UltraMsg لو مستخدمها فعلياً (دور عليها بالبحث عن `getSetting` في الكود، بعض الإعدادات دي متخزنة في جدول `Setting` بقاعدة البيانات مش env، فهتضبطها من لوحة تحكم الأدمن بعد النشر).
4. اضغط Deploy.

## خطوة 4: جهّز الجداول في قاعدة البيانات
بعد أول ديبلوي، شغّل من جهازك (بعد ما تحط نفس الـ DATABASE_URL في `.env` محلي):
```bash
npm install
npx prisma db push
```
ده هيبني الجداول على Neon مباشرة. لو عايز تحط بيانات تجريبية:
```bash
npx tsx scripts/seed.ts
npx tsx scripts/seed-banners.ts
```

## خطوة 5: فعّل Vercel Blob لرفع صور البانرات
رفع صور البانرات من لوحة التحكم بقى شغال عن طريق **Vercel Blob** بدل القرص المحلي (القرص المحلي ما كانش هيشتغل على Vercel أصلاً).

1. في مشروعك على Vercel: **Storage > Create Database > Blob**، وسمّيه أي اسم.
2. اربطه بالمشروع (Connect Project) — Vercel هيضيف متغير `BLOB_READ_WRITE_TOKEN` تلقائياً في Environment Variables، مش محتاج تكتبه إنت بإيدك.
3. اعمل Redeploy عشان المتغير يتفعّل.

بعد كده أي صورة بانر هترفعها من لوحة التحكم هتتخزن على Blob وترجعلك رابط https مباشر، وهتفضل موجودة حتى مع أي ديبلوي جديد.

> ملاحظة: صورتين البانر اللي كانوا موجودين في `public/uploads` (من التجربة المحلية) هيفضلوا شغالين عادي كملفات ثابتة، بس أي رفع جديد من دلوقتي هيروح على Blob.
