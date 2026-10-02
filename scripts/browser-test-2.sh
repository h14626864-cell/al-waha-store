#!/bin/bash
# الاختبار الثاني: بوابة الدفع بالبطاقة + تتبع + حساب + لوحة تحكم
cd /home/z/my-project
B="agent-browser"

# السيرفر
setsid nohup bun run dev < /dev/null > /dev/null 2>&1 &
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 3 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "✓ السيرفر جاهز"

# جلب رقم طلب غير مدفوع (بطاقة مرفوضة سابقًا)
UNPAID=$(curl -s --max-time 30 -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName":"مروان التجريبي","phone":"01111112222","city":"القاهرة","address":"شارع النصر عمارة 8 الدور 2","paymentMethod":"CARD","items":[]}' > /dev/null; \
  curl -s "http://localhost:3000/api/orders/$(echo skip)" 2>/dev/null)
# استخدم أحدث طلب CARD غير مدفوع من قاعدة البيانات مباشرة
ORDER_NUM=$(bunx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.order.findFirst({ where: { paymentMethod: 'CARD', payments: { none: { status: 'PAID' } } }, orderBy: { createdAt: 'desc' } })
  .then(o => { console.log(o?.orderNumber || ''); return p.\$disconnect(); });
" 2>/dev/null | tail -1)
echo "طلب الاختبار غير المدفوع: $ORDER_NUM"

echo ""
echo "===== 1) صفحة بوابة الدفع ====="
$B open "http://localhost:3000/#/pay/$ORDER_NUM" 2>/dev/null
$B wait --load networkidle --timeout 20000
$B wait 1500
PAY_SNAP=$($B snapshot -i 2>/dev/null)
echo "$PAY_SNAP" | rg "textbox|button" | head -10
$B screenshot /home/z/my-project/img_results/test-payment-page.png 2>/dev/null

echo ""
echo "===== 2) إدخال بطاقة ناجحة والدفع ====="
CARD_NUM=$($B snapshot -i 2>/dev/null | rg -o 'textbox "4242[^"]*" \[ref=(@\w+)\]' -r '$1' | head -1)
CARD_NAME=$($B snapshot -i 2>/dev/null | rg -o 'textbox "AHMED[^"]*" \[ref=(@\w+)\]' -r '$1' | head -1)
CARD_EXP=$($B snapshot -i 2>/dev/null | rg -o 'textbox "MM/YY" \[ref=(@\w+)\]' -r '$1' | head -1)
CARD_CVC=$($B snapshot -i 2>/dev/null | rg -o 'textbox "123" \[ref=(@\w+)\]' -r '$1' | head -1)
PAY_BTN=$($B snapshot -i 2>/dev/null | rg -o 'button "ادفع[^"]*" \[ref=(@\w+)\]' -r '$1' | head -1)
echo "refs: num=$CARD_NUM name=$CARD_NAME exp=$CARD_EXP cvc=$CARD_CVC btn=$PAY_BTN"

$B fill "$CARD_NUM" "4242424242424242" 2>/dev/null
$B fill "$CARD_NAME" "AHMED MAHMOUD" 2>/dev/null
$B fill "$CARD_EXP" "1228" 2>/dev/null
$B fill "$CARD_CVC" "123" 2>/dev/null
$B wait 500
echo "قيم الحقول بعد التعبئة:"
echo "  رقم: $($B get value "$CARD_NUM" 2>/dev/null)"
echo "  انتهاء: $($B get value "$CARD_EXP" 2>/dev/null)"
$B click "$PAY_BTN" 2>/dev/null
$B wait 3000
SUCCESS=$($B eval "document.body.innerText.includes('تم الدفع بنجاح') ? '✓ نجح الدفع' : '✗ فشل'" 2>/dev/null)
echo "$SUCCESS"
$B screenshot /home/z/my-project/img_results/test-payment-success.png 2>/dev/null
$B wait 2000
echo "الرابط بعد التحويل: $($B get url 2>/dev/null)"

echo ""
echo "===== 3) تتبع الطلب المدفوع بالرقم ====="
$B open "http://localhost:3000/#/track?order=$ORDER_NUM" 2>/dev/null
$B wait --load networkidle --timeout 15000
$B wait 1500
TRACKED=$($B eval "
document.body.innerText.includes('تم التأكيد') && document.body.innerText.includes('تم الدفع بنجاح')
  ? '✓ التتبع يعمل — الحالة: تم التأكيد + الدفع PAID'
  : document.body.innerText.includes('قيد المراجعة')
    ? '✓ التتبع يعمل — الحالة: قيد المراجعة'
    : '✗ التتبع مش شغال'
" 2>/dev/null)
echo "$TRACKED"
$B screenshot /home/z/my-project/img_results/test-track.png 2>/dev/null

echo ""
echo "===== 4) تسجيل عميل جديد من الواجهة ====="
$B open "http://localhost:3000/#/register" 2>/dev/null
$B wait --load networkidle --timeout 15000
$B wait 1200
NAME_REF=$($B snapshot -i 2>/dev/null | rg -o 'textbox "مثال: أحمد محمود" \[required, ref=(@\w+)\]' -r '$1')
PHONE_REF=$($B snapshot -i 2>/dev/null | rg -o 'textbox "01xxxxxxxxx" \[ref=(@\w+)\]' -r '$1')
EMAIL_REF=$($B snapshot -i 2>/dev/null | rg -o 'textbox "example@mail.com" \[required, ref=(@\w+)\]' -r '$1')
PASS_REF=$($B snapshot -i 2>/dev/null | rg -o 'textbox "••••••••" \[required, ref=(@\w+)\]' -r '$1')
SUBMIT_REF=$($B snapshot -i 2>/dev/null | rg -o 'button "إنشاء الحساب" \[ref=(@\w+)\]' -r '$1')
RAND=$RANDOM
$B fill "$NAME_REF" "سارة محمد" 2>/dev/null
$B fill "$PHONE_REF" "01278899001" 2>/dev/null
$B fill "$EMAIL_REF" "sara$RAND@test.com" 2>/dev/null
$B fill "$PASS_REF" "secret123" 2>/dev/null
$B click "$SUBMIT_REF" 2>/dev/null
$B wait 3000
$B wait --url "#/account" --timeout 8000 2>/dev/null
URL=$($B get url 2>/dev/null)
echo "الرابط بعد التسجيل: $URL"
ACCOUNT_OK=$($B eval "document.body.innerText.includes('سارة محمد') ? '✓ الحساب اتعمل والاسم ظاهر' : '✗ مش ظاهر'" 2>/dev/null)
echo "$ACCOUNT_OK"
$B screenshot /home/z/my-project/img_results/test-account.png 2>/dev/null

echo ""
echo "انتهى الاختبار الثاني"
