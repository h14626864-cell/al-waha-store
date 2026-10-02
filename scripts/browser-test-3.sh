#!/bin/bash
# الاختبار الثالث: دفع فعلي عبر الواجهة + تسجيل + لوحة التحكم
cd /home/z/my-project
B="agent-browser"

setsid nohup bun run dev < /dev/null > /dev/null 2>&1 &
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 3 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "✓ السيرفر جاهز"

# طلب غير مدفوع
ORDER_NUM=$(bunx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.order.findFirst({ where: { paymentMethod: 'CARD', payments: { none: { status: 'PAID' } } }, orderBy: { createdAt: 'desc' } })
  .then(o => { console.log(o?.orderNumber || ''); return p.\$disconnect(); });
" 2>/dev/null | tail -1)
echo "الطلب المستخدم: $ORDER_NUM"

# دالة تعبئة React-safe (تُستخدم مرارًا)
FILL='
const fillInput = (ph, val) => {
  const el = document.querySelector(`input[placeholder="${ph}"]`);
  if (!el) return `missing: ${ph}`;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(el, val);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return `ok: ${ph}`;
};
'

echo ""
echo "===== 1) الدفع بالبطاقة عبر الواجهة ====="
$B open "http://localhost:3000/#/pay/$ORDER_NUM" 2>/dev/null
$B wait --load networkidle --timeout 20000
$B wait 1500
$B eval "$FILL
[fillInput('4242 4242 4242 4242','4242424242424242'),
 fillInput('AHMED MOHAMED','AHMED MAHMOUD'),
 fillInput('MM/YY','1228'),
 fillInput('123','999')].join(' | ')" 2>/dev/null
$B wait 600
$B eval "[...document.querySelectorAll('button')].find(b => b.textContent.includes('ادفع'))?.click(); 'clicked'" 2>/dev/null
$B wait 3500
PAY_RESULT=$($B eval "document.body.innerText.includes('تم الدفع بنجاح') ? '✓ الدفع نجح من الواجهة' : '✗ الدفع فشل'" 2>/dev/null)
echo "$PAY_RESULT"
$B screenshot /home/z/my-project/img_results/test-payment-success.png 2>/dev/null
$B wait 2200
echo "التحويل إلى: $($B get url 2>/dev/null)"

echo ""
echo "===== 2) تتبع نفس الطلب (لازم يبقى CONFIRMED + PAID) ====="
$B open "http://localhost:3000/#/track?order=$ORDER_NUM" 2>/dev/null
$B wait --load networkidle --timeout 15000
$B wait 1800
$B eval "
document.body.innerText.includes('تم التأكيد') && document.body.innerText.includes('تم الدفع بنجاح')
  ? '✓ تتبع مظبوط: تم التأكيد + تم الدفع'
  : '✗ حالات مش متطابقة'
" 2>/dev/null
$B screenshot /home/z/my-project/img_results/test-track-paid.png 2>/dev/null

echo ""
echo "===== 3) تسجيل عميل جديد من الواجهة ====="
RAND=$RANDOM$RANDOM
$B open "http://localhost:3000/#/register" 2>/dev/null
$B wait --load networkidle --timeout 15000
$B wait 1300
$B eval "$FILL
fillInput('مثال: أحمد محمود','منى عبد الله');
fillInput('01xxxxxxxxx','01098877665');
fillInput('example@mail.com','mona$RAND@gmail.com');
fillInput('••••••••','mona123456');
'filled'" 2>/dev/null
$B wait 500
$B eval "[...document.querySelectorAll('button')].find(b => b.textContent.includes('إنشاء الحساب'))?.click(); 'submitted'" 2>/dev/null
$B wait 3000
URL=$($B get url 2>/dev/null)
echo "الرابط: $URL"
$B eval "document.body.innerText.includes('منى عبد الله') ? '✓ التسجيل نجح والاسم ظاهر في الحساب' : '✗ التسجيل فشل'" 2>/dev/null
$B screenshot /home/z/my-project/img_results/test-account-new.png 2>/dev/null

echo ""
echo "===== 4) طلبات العميل في صفحة الحساب ====="
$B eval "document.body.innerText.includes('طلباتي') ? '✓ صفحة الطلبات موجودة' : '✗ مفقود'" 2>/dev/null

echo ""
echo "===== 5) لوحة التحكم: تسجيل دخول الأدمن ====="
$B open "http://localhost:3000/#/admin" 2>/dev/null
$B wait --load networkidle --timeout 15000
$B wait 1300
$B eval "$FILL
const setVal2 = (sel, val) => {
  const el = document.querySelector(sel);
  if (!el) return 'missing';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return 'ok';
};
setVal2('input[type=\"email\"]','admin@alwaha.com');
setVal2('input[type=\"password\"]','admin123');
'filled'" 2>/dev/null
$B wait 400
$B eval "[...document.querySelectorAll('button')].find(b => b.textContent.includes('تسجيل الدخول'))?.click(); 'clicked'" 2>/dev/null
$B wait 3000
$B eval "document.body.innerText.includes('النظرة العامة') ? '✓ دخول الأدمن نجح' : '✗ فشل دخول الأدمن'" 2>/dev/null

echo ""
echo "===== 6) تبويب البانرات والإعلانات ====="
$B eval "[...document.querySelectorAll('button')].find(b => b.textContent.includes('البانرات والإعلانات'))?.click(); 'tab'" 2>/dev/null
$B wait 1500
$B eval "document.body.innerText.includes('تخفيضات نهاية الأسبوع') ? '✓ البانرات ظاهرة في اللوحة' : '✗ مش ظاهرة'" 2>/dev/null
$B screenshot /home/z/my-project/img_results/test-admin-banners.png 2>/dev/null

echo ""
echo "===== 7) تبويب الدعم الفني + الرد على التذكرة ====="
$B eval "[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'الدعم الفني')?.click(); 'tab'" 2>/dev/null
$B wait 1500
$B eval "document.body.innerText.includes('استفسار عن الشحن') ? '✓ التذكرة ظاهرة في اللوحة' : '✗ مش ظاهرة'" 2>/dev/null
$B screenshot /home/z/my-project/img_results/test-admin-support.png 2>/dev/null

echo ""
echo "===== 8) تبويب العملاء ====="
$B eval "[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'العملاء')?.click(); 'tab'" 2>/dev/null
$B wait 1500
$B eval "document.body.innerText.includes('سارة محمد') || document.body.innerText.includes('منى عبد الله') ? '✓ العملاء الجدد ظاهرين' : 'فحص الاسم'" 2>/dev/null
$B screenshot /home/z/my-project/img_results/test-admin-customers.png 2>/dev/null

echo ""
echo "===== 9) تبويب الإعدادات ====="
$B eval "[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'الإعدادات')?.click(); 'tab'" 2>/dev/null
$B wait 1500
$B eval "document.body.innerText.includes('بوابة الدفع الإلكتروني (Stripe)') ? '✓ إعدادات الدفع موجودة' : '✗ مفقودة'" 2>/dev/null
$B screenshot /home/z/my-project/img_results/test-admin-settings.png 2>/dev/null

echo ""
echo "===== 10) اختبار الموبايل (390px) ====="
$B set viewport 390 844 2>/dev/null
$B open "http://localhost:3000/" 2>/dev/null
$B wait --load networkidle --timeout 15000
$B wait 1500
$B screenshot /home/z/my-project/img_results/test-mobile-home.png 2>/dev/null
$B eval "document.body.scrollWidth <= 400 ? '✓ لا يوجد تمرير أفقي' : '✗ يوجد تمرير أفقي: ' + document.body.scrollWidth" 2>/dev/null

echo ""
echo "انتهت كل الاختبارات"
