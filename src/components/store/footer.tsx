"use client";

import { Store, Phone, Mail, MapPin, Truck, ShieldCheck, RotateCcw, CreditCard } from "lucide-react";

interface FooterProps {
  storeName?: string;
  storeNameEn?: string;
  storeLogo?: string;
  storeEmail?: string;
  storeAddress?: string;
  supportPhone?: string;
}

export function Footer({
  storeName = "الواحة",
  storeNameEn = "Al-Waha Store",
  storeLogo = "",
  storeEmail = "support@alwaha-store.com",
  storeAddress = "٢٧ شارع التحرير، وسط البلد، القاهرة",
  supportPhone = "19999",
}: FooterProps) {
  return (
    <footer className="mt-auto bg-primary text-primary-foreground">
      {/* شريط الثقة */}
      <div className="border-b border-primary-foreground/10">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Truck, title: "شحن سريع", desc: "توصيل خلال 2-4 أيام لكل المحافظات" },
            { icon: CreditCard, title: "دفع عند الاستلام", desc: "ادفع كاش أو بالبطاقة عند بابك" },
            { icon: RotateCcw, title: "استرجاع مجاني", desc: "خلال 14 يوم من الاستلام" },
            { icon: ShieldCheck, title: "منتجات أصلية", desc: "ضمان الوكيل الرسمي على كل الأجهزة" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="size-10 shrink-0 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                <f.icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-primary-foreground/60 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* الروابط */}
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2.5">
            {storeLogo ? (
              <img
                src={storeLogo}
                alt={storeName}
                className="size-10 rounded-xl object-cover border border-primary-foreground/20"
              />
            ) : (
              <span className="size-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                <Store className="size-5" />
              </span>
            )}
            <div className="leading-tight">
              <p className="font-bold text-lg">{storeName}</p>
              <p className="text-[10px] tracking-widest uppercase text-primary-foreground/50">
                {storeNameEn}
              </p>
            </div>
          </div>
          <p className="text-sm text-primary-foreground/60 mt-4 leading-relaxed max-w-xs">
            متجرك المصري لكل احتياجاتك — إلكترونيات أصلية، أزياء مختارة بعناية، وعطور فاخرة بأفضل
            الأسعار مع خدمة عملاء تهتم فعلًا.
          </p>
        </div>

        <div>
          <p className="text-sm font-bold mb-4">روابط سريعة</p>
          <ul className="space-y-2.5 text-sm text-primary-foreground/60">
            <li><a href="#/" className="hover:text-primary-foreground transition">الصفحة الرئيسية</a></li>
            <li><a href="#/offers" className="hover:text-primary-foreground transition">العروض والخصومات</a></li>
            <li><a href="#/track" className="hover:text-primary-foreground transition">تتبع طلبك</a></li>
            <li><a href="#/support" className="hover:text-primary-foreground transition">الدعم الفني</a></li>
            <li><a href="#/account" className="hover:text-primary-foreground transition">حسابي وطلباتي</a></li>
            <li><a href="#/category/all" className="hover:text-primary-foreground transition">كل المنتجات</a></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold mb-4">التصنيفات</p>
          <ul className="space-y-2.5 text-sm text-primary-foreground/60">
            <li><a href="#/category/electronics" className="hover:text-primary-foreground transition">إلكترونيات</a></li>
            <li><a href="#/category/fashion" className="hover:text-primary-foreground transition">أزياء</a></li>
            <li><a href="#/category/beauty" className="hover:text-primary-foreground transition">عطور وتجميل</a></li>
            <li><a href="#/cart" className="hover:text-primary-foreground transition">سلة التسوق</a></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold mb-4">تواصل معنا</p>
          <ul className="space-y-3 text-sm text-primary-foreground/60">
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0" />
              <span className="price-num">{supportPhone} — يوميًا من 9 ص إلى 11 م</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 shrink-0" />
              <span dir="ltr">{storeEmail}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="size-4 shrink-0 mt-0.5" />
              <span>{storeAddress}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-primary-foreground/50">
          <p className="price-num">© 2025 {storeName} — جميع الحقوق محفوظة</p>
          <p>طرق الدفع: كاش عند الاستلام · بطاقة بنكية عبر Paymob · بطاقة عند الاستلام</p>
        </div>
      </div>
    </footer>
  );
}
