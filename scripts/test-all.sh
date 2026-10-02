#!/bin/bash
# اختبار شامل لكل APIs المتجر في جلسة واحدة
cd /home/z/my-project

# تشغيل السيرفر
setsid nohup bun run dev < /dev/null > /dev/null 2>&1 &
echo "جاري تشغيل السيرفر..."
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 5 2>/dev/null)
  if [ "$code" = "200" ]; then echo "السيرفر شغال بعد $i ثانية"; break; fi
  sleep 1
done

echo ""
echo "===== 1) اختبار البانرات ====="
curl -s --max-time 90 http://localhost:3000/api/banners | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('success:', d['success'], '| count:', len(d['banners']))
for b in d['banners'][:5]: print(' -', b['placement'], '|', b['title'][:40])
"

echo ""
echo "===== 2) اختبار الإعدادات ====="
curl -s --max-time 30 http://localhost:3000/api/settings | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('success:', d['success'], '| announcement:', d['settings'].get('announcement', '')[:50])
"

echo ""
echo "===== 3) فلترة التصنيفات (API) ====="
curl -s --max-time 30 "http://localhost:3000/api/products?category=electronics" | python3 -c "
import json, sys
d = json.load(sys.stdin)
cats = set(p['category']['slug'] for p in d['products'])
print('electronics products:', len(d['products']), '| فقط من تصنيف:', cats)
"

echo ""
echo "===== 4) تسجيل عميل جديد ====="
RAND=$RANDOM
curl -s --max-time 30 -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -c /tmp/cookies.txt \
  -d "{\"name\":\"عميل تجريبي\",\"email\":\"test$RAND@test.com\",\"phone\":\"0101234567$RAND\",\"password\":\"123456\"}" | head -c 200
echo ""

echo ""
echo "===== 5) حالة الجلسة (me) ====="
curl -s --max-time 30 http://localhost:3000/api/auth/me -b /tmp/cookies.txt | head -c 200
echo ""

echo ""
echo "===== 6) إنشاء تذكرة دعم ====="
curl -s --max-time 30 -X POST http://localhost:3000/api/support/tickets \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d '{"name":"عميل تجريبي","email":"test@test.com","subject":"استفسار عن الشحن","message":"متى يوصل طلبي لمحافظة المنوفية؟"}' > /tmp/ticket.json
python3 -c "
import json
d = json.load(open('/tmp/ticket.json'))
print('success:', d['success'], '| ticket:', d.get('ticket', {}).get('ticketNumber'))
"

echo ""
echo "===== 7) إنشاء طلب ثم دفع بالبطاقة ====="
# جلب منتج أولًا
PID=$(curl -s --max-time 30 http://localhost:3000/api/products | python3 -c "import json,sys; print(json.load(sys.stdin)['products'][0]['id'])")
ORDER=$(curl -s --max-time 30 -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d "{\"customerName\":\"عميل تجريبي\",\"phone\":\"01001234567\",\"city\":\"القاهرة\",\"address\":\"شارع التحرير عمارة 5 الدور 3\",\"paymentMethod\":\"CARD\",\"items\":[{\"productId\":\"$PID\",\"quantity\":1}]}")
ORDER_NUM=$(echo "$ORDER" | python3 -c "import json,sys; print(json.load(sys.stdin)['order']['orderNumber'])")
echo "الطلب: $ORDER_NUM"

# الدفع ببطاقة ناجحة
curl -s --max-time 30 -X POST http://localhost:3000/api/payments/process \
  -H "Content-Type: application/json" \
  -d "{\"orderNumber\":\"$ORDER_NUM\",\"cardNumber\":\"4242424242424242\",\"cardName\":\"AHMED TEST\",\"expiry\":\"12/28\",\"cvc\":\"123\"}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('دفع ناجح:', d['success'], '| مرجع:', d.get('reference'), '| حالة الطلب:', d.get('order', {}).get('status'))
"

# طلب آخر ببطاقة مرفوضة
ORDER2=$(curl -s --max-time 30 -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d "{\"customerName\":\"عميل ثاني\",\"phone\":\"01009876543\",\"city\":\"الجيزة\",\"address\":\"شارع الهرم عمارة 10 الدور 1\",\"paymentMethod\":\"CARD\",\"items\":[{\"productId\":\"$PID\",\"quantity\":1}]}")
ORDER_NUM2=$(echo "$ORDER2" | python3 -c "import json,sys; print(json.load(sys.stdin)['order']['orderNumber'])")
echo "الطلب الثاني: $ORDER_NUM2"
curl -s --max-time 30 -X POST http://localhost:3000/api/payments/process \
  -H "Content-Type: application/json" \
  -d "{\"orderNumber\":\"$ORDER_NUM2\",\"cardNumber\":\"4000000000000002\",\"cardName\":\"TEST USER\",\"expiry\":\"11/27\",\"cvc\":\"456\"}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('رفض البطاقة (متوقع true للرسالة):', 'error' in d and 'رفض' in d.get('error', ''), '|', d.get('error', '')[:50])
"

echo ""
echo "===== 8) تتبع الطلب بالرقم ====="
curl -s --max-time 30 "http://localhost:3000/api/orders/$ORDER_NUM" | python3 -c "
import json, sys
d = json.load(sys.stdin)
o = d['order']
print('الطلب:', o['orderNumber'], '| الحالة:', o['status'], '| مدفوع:', o['payments'][0]['status'] if o.get('payments') else 'N/A')
"

echo ""
echo "===== 9) طلبات العميل المسجل ====="
curl -s --max-time 30 http://localhost:3000/api/customer/orders -b /tmp/cookies.txt | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('success:', d['success'], '| عدد طلبات العميل:', len(d['orders']))
"

echo ""
echo "===== 10) دخول الأدمن وإدارة الإعدادات ====="
curl -s --max-time 30 -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -c /tmp/admin_cookies.txt \
  -d '{"email":"admin@alwaha.com","password":"admin123"}' | head -c 120
echo ""
curl -s --max-time 30 http://localhost:3000/api/admin/tickets -b /tmp/admin_cookies.txt | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('تذاكر الأدمن:', d['success'], '| عدد:', len(d['tickets']))
"
curl -s --max-time 30 http://localhost:3000/api/admin/customers -b /tmp/admin_cookies.txt | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('عملاء الأدمن:', d['success'], '| عدد:', len(d['customers']))
"
curl -s --max-time 30 -X PUT http://localhost:3000/api/admin/settings \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt \
  -d '{"announcement":"عروض الأسبوع — شحن مجاني فوق 3000 ج.م"}' | head -c 60
echo ""

echo ""
echo "===== 11) بوابة الدفع checkout (بدون مفاتيح Stripe) ====="
curl -s --max-time 30 -X POST http://localhost:3000/api/payments/checkout \
  -H "Content-Type: application/json" \
  -d "{\"orderNumber\":\"$ORDER_NUM2\"}" | head -c 200
echo ""
echo ""
echo "===== انتهت الاختبارات ====="
