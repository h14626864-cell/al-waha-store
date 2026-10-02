#!/bin/bash
# اختبار متصفح: مؤقت العروض + تبويب الإشعارات والعروض + الموبايل
cd /home/z/my-project
B="agent-browser"

echo "===== 1) صفحة العروض — المؤقت التنازلي (ديسكتوب) ====="
$B set viewport 1366 900 2>/dev/null
$B open "http://localhost:3000/#/offers" 2>/dev/null
$B wait --load networkidle --timeout 30000 2>/dev/null
$B wait 2500
$B eval "document.body.innerText.includes('العرض بينتهي خلال') ? '✓ المؤقت ظاهر' : '✗ المؤقت مش ظاهر'" 2>/dev/null
$B eval "
(() => {
  const m = document.body.innerText.match(/(\d{2}):(\d{2}):(\d{2})/);
  return m ? 'قيم المؤقت: ' + m[0] : 'بدون قيم';
})()" 2>/dev/null
$B screenshot /home/z/my-project/img_results/v5-offers-countdown.png 2>/dev/null
echo ""

echo "===== 2) اللوحة — تسجيل دخول وتبويب الإشعارات ====="
$B open "http://localhost:3000/#/admin" 2>/dev/null
$B wait --load networkidle --timeout 30000 2>/dev/null
$B wait 2000
EMAIL=$($B snapshot -i 2>/dev/null | rg -o 'textbox "[^"]*البريد[^"]*" \[ref=(@\w+)\]' -r '$1' | head -1)
PASS=$($B snapshot -i 2>/dev/null | rg -o 'textbox "[^"]*(كلمة|password)[^"]*" \[ref=(@\w+)\]' -r '$1' | head -1)
BTN=$($B snapshot -i 2>/dev/null | rg -o 'button "[^"]*دخول[^"]*" \[ref=(@\w+)\]' -r '$1' | head -1)
echo "refs: email=$EMAIL pass=$PASS btn=$BTN"
$B fill "$EMAIL" "admin@alwaha.com" 2>/dev/null
$B fill "$PASS" "admin123" 2>/dev/null
$B click "$BTN" 2>/dev/null
$B wait 2500
# افتح الإعدادات
SET_BTN=$($B snapshot -i 2>/dev/null | rg -o 'button "[^"]*الإعدادات[^"]*" \[ref=(@\w+)\]' -r '$1' | head -1)
echo "settings-btn=$SET_BTN"
$B click "$SET_BTN" 2>/dev/null
$B wait 1500
# اضغط تبويب الإشعارات والعروض
NOTIFY_TAB=$($B snapshot -i 2>/dev/null | rg -o 'button "[^"]*الإشعارات والعروض[^"]*" \[ref=(@\w+)\]' -r '$1' | head -1)
echo "notify-tab=$NOTIFY_TAB"
$B click "$NOTIFY_TAB" 2>/dev/null
$B wait 1500
$B eval "
(() => {
  const t = document.body.innerText;
  const checks = {
    'كارت واتساب': t.includes('إشعارات واتساب للعملاء'),
    'شرح التفعيل': t.includes('إمتى الرسائل بتتبعت'),
    'اختبار الإرسال': t.includes('إرسال رسالة تجريبية'),
    'كارت المؤقت': t.includes('مؤقت العروض التنازلي'),
    'أزرار سريعة': t.includes('بعد أسبوع'),
  };
  return Object.entries(checks).map(([k,v]) => (v ? '✓ ' : '✗ ') + k).join(' | ');
})()" 2>/dev/null
$B screenshot /home/z/my-project/img_results/v5-admin-notify-tab.png 2>/dev/null
echo ""

echo "===== 3) الموبايل 390px — العروض واللوحة ====="
$B set viewport 390 844 2>/dev/null
$B open "http://localhost:3000/#/offers" 2>/dev/null
$B wait --load networkidle --timeout 30000 2>/dev/null
$B wait 2000
$B eval "document.documentElement.scrollWidth <= 390 ? '✓ عروض موبايل: بدون تمرير أفقي' : '✗ تمرير أفقي ' + document.documentElement.scrollWidth + 'px'" 2>/dev/null
$B screenshot /home/z/my-project/img_results/v5-mobile-offers.png 2>/dev/null
$B open "http://localhost:3000/#/admin" 2>/dev/null
$B wait --load networkidle --timeout 30000 2>/dev/null
$B wait 1500
$B eval "document.documentElement.scrollWidth <= 390 ? '✓ لوحة موبايل: بدون تمرير أفقي' : '✗ تمرير أفقي ' + document.documentElement.scrollWidth + 'px'" 2>/dev/null
