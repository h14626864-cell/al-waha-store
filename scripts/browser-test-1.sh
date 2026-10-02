#!/bin/bash
# اختبار المتصفح الشامل للمتجر — جلسة واحدة
cd /home/z/my-project
B="agent-browser"

echo "===== تشغيل السيرفر ====="
setsid nohup bun run dev < /dev/null > /dev/null 2>&1 &
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 3 2>/dev/null)
  if [ "$code" = "200" ]; then echo "✓ السيرفر شغال"; break; fi
  sleep 1
done

$B set viewport 1366 900 2>/dev/null

echo ""
echo "===== 1) الصفحة الرئيسية ====="
$B open http://localhost:3000/
$B wait --load networkidle --timeout 20000
$B wait 1500
$B screenshot /home/z/my-project/img_results/test-home.png 2>/dev/null
echo "عنوان الصفحة: $($B get title)"
echo "عدد البانرات الظاهرة في الهيرو: $($B get count 'img[alt*="تخفيضات"], img[alt*="عرض العطور"]')"
echo "شريط الإعلان: $($B find text "عروض الأسبوع" text 2>/dev/null | head -1)"
echo "روابط العروض في الناف: $($B get count 'a[href="#/offers"]')"

echo ""
echo "===== 2) صفحة تصنيف — فلترة المنتجات (الإصلاح الرئيسي) ====="
$B open "http://localhost:3000/#/category/electronics"
$B wait --load networkidle --timeout 15000
$B wait 1500
COUNT=$($B get count ".group, [class*='grid'] > a[href*='#/product']" 2>/dev/null)
PRODUCT_CARDS=$($B get count "a[href^='#/product']" 2>/dev/null)
echo "بطاقات المنتجات في تصنيف electronics: $PRODUCT_CARDS"
TITLES=$($B eval "Array.from(document.querySelectorAll('a[href^=\"#/product\"] h3, a[href^=\"#/product\"] [class*=font-semibold]')).map(e=>e.textContent.trim()).slice(0,6).join(' | ')" 2>/dev/null)
echo "أسماء المنتجات المعروضة: $TITLES"
$B screenshot /home/z/my-project/img_results/test-category.png 2>/dev/null

echo ""
echo "===== 3) صفحة العروض ====="
$B open "http://localhost:3000/#/offers"
$B wait --load networkidle --timeout 15000
$B wait 1500
DEALS=$($B get count "a[href^='#/product']" 2>/dev/null)
echo "منتجات العروض: $DEALS"
$B screenshot /home/z/my-project/img_results/test-offers.png 2>/dev/null

echo ""
echo "===== 4) صفحة تتبع الطلب (طلب حقيقي مدفوع) ====="
$B open "http://localhost:3000/#/track"
$B wait --load networkidle --timeout 15000
$B wait 1000
TRACK_SNAP=$($B snapshot -i 2>/dev/null | head -20)
echo "$TRACK_SNAP"

echo ""
echo "===== 5) صفحة الدعم ====="
$B open "http://localhost:3000/#/support"
$B wait --load networkidle --timeout 15000
$B wait 1200
SUPPORT_TEXT=$($B eval "document.body.innerText.includes('افتح تذكرة جديدة') ? 'نموذج التذاكر موجود' : 'مفقود!'" 2>/dev/null)
echo "الدعم: $SUPPORT_TEXT"
$B screenshot /home/z/my-project/img_results/test-support.png 2>/dev/null

echo ""
echo "===== 6) تسجيل عميل من الواجهة ====="
$B open "http://localhost:3000/#/register"
$B wait --load networkidle --timeout 15000
$B wait 1200
echo "$B snapshot:"
REG_SNAP=$($B snapshot -i 2>/dev/null)
echo "$REG_SNAP" | head -25

echo ""
echo "انتهى الاختبار الجزئي — التكميل في السكريبت الثاني"
