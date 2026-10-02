"use client";

import { useEffect, useState } from "react";
import { Loader2, ShoppingBag, PartyPopper, TriangleAlert, ArrowLeft } from "lucide-react";
import { useCart } from "@/lib/store";
import { formatEGP, navigate } from "@/lib/shop-utils";
import type { AbandonedCartInfo } from "@/lib/types";

// ============================================================
// صفحة استرجاع السلة المتروكة — بتفتح من لينك الإيميل/الواتساب
// /#/complete-cart?token=xxxx
// بتجيب السلة من السيرفر، بترجّعها لسلة العميل كما هي
// (بنفس المقاسات والألوان)، وبتملي بيانات التواصل في صفحة الدفع
// ============================================================
export function CompleteCartView({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [cart, setCart] = useState<AbandonedCartInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const restore = useCart((s) => s.clear);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/abandoned-cart?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) {
          setErrorMsg(data.error || "السلة غير متاحة");
          setState("error");
          return;
        }
        const c = data.cart as AbandonedCartInfo;
        setCart(c);
        setState("ok");

        // 1) استرجاع بيانات التواصل للدفع (تُقرأ في صفحة إتمام الطلب)
        try {
          sessionStorage.setItem(
            "alwaha-recover",
            JSON.stringify({
              customerName: c.customerName || "",
              phone: c.phone || "",
              email: c.email || "",
              city: c.city || "",
            })
          );
        } catch {
          /* تجاهل */
        }

        // 2) إعادة بناء سلة العميل من لقطة السلة المحفوظة
        const lines = (c.items as unknown as {
          productId: string;
          name: string;
          slug: string;
          image: string;
          price: number;
          quantity: number;
          size?: string | null;
          color?: string | null;
          variantId?: string | null;
          variantName?: string | null;
        }[]).map((i) => ({
          id: [i.productId, i.size || "", i.color || "", i.variantId || ""].join("|"),
          productId: i.productId,
          variantId: i.variantId || undefined,
          variantName: i.variantName || undefined,
          size: i.size || undefined,
          color: i.color || undefined,
          name: i.name,
          slug: i.slug,
          image: i.image,
          price: i.price,
          quantity: i.quantity,
          stock: 99, // المخزون الحقيقي بيتحقق من السيرفر عند إنشاء الطلب
        }));
        restore(); // إزالة أي سلة قديمة — بنستبدلها بسلة الاسترجاع
        useCart.setState({ lines });
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMsg("حدث خطأ في الاتصال — حاول مرة أخرى");
          setState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, restore]);

  // بعد الاسترجاع الناجح → نقل تلقائي لصفحة إتمام الطلب
  useEffect(() => {
    if (state !== "ok") return;
    const t = setTimeout(() => navigate("/checkout"), 2200);
    return () => clearTimeout(t);
  }, [state]);

  if (state === "loading") {
    return (
      <div className="text-center py-24">
        <Loader2 className="size-10 animate-spin text-primary mx-auto" />
        <p className="mt-5 font-bold text-lg">جاري استرجاع سلتك...</p>
        <p className="text-sm text-muted-foreground mt-2">لحظة واحدة ونجهز كل حاجة</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="text-center py-20 border rounded-2xl bg-card max-w-lg mx-auto">
        <TriangleAlert className="size-12 text-amber-500 mx-auto" />
        <p className="mt-4 font-bold text-lg">تعذّر استرجاع السلة</p>
        <p className="mt-2 text-sm text-muted-foreground px-6 leading-relaxed">{errorMsg}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 rounded-xl bg-primary text-primary-foreground px-7 py-3 text-sm font-bold hover:bg-primary/90 transition inline-flex items-center gap-2"
        >
          <ArrowLeft className="size-4" />
          ابدأ التسوق من جديد
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-16 border rounded-2xl bg-card max-w-xl mx-auto">
      <span className="inline-flex size-16 rounded-full bg-emerald-100 items-center justify-center">
        <PartyPopper className="size-8 text-emerald-700" />
      </span>
      <h1 className="mt-5 text-2xl font-bold">سلتك جاهزة زي ما سبتها 🛍️</h1>
      <p className="mt-2 text-sm text-muted-foreground px-6 leading-relaxed">
        رجّعنا لك {cart?.items.length ?? 0} منتج بإجمالي{" "}
        <span className="price-num font-bold text-primary">{formatEGP(cart?.subtotal ?? 0)}</span>
        {" "}— هننقلك لصفحة إتمام الطلب تلقائيًا خلال لحظات، وبياناتك محفوظة.
      </p>

      <div className="mt-6 max-w-sm mx-auto space-y-2 text-start px-4">
        {((cart?.items as unknown as { name: string; image: string; quantity: number }[]) || []).map((i, idx) => (
          <div key={idx} className="flex items-center gap-3 bg-accent/40 rounded-lg p-2">
            <img src={i.image} alt={i.name} className="size-11 rounded-md object-cover border" />
            <p className="text-xs font-semibold line-clamp-1 flex-1">{i.name}</p>
            <span className="price-num text-xs font-bold">× {i.quantity}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate("/checkout")}
        className="mt-7 rounded-xl bg-primary text-primary-foreground px-8 py-3.5 text-sm font-bold hover:bg-primary/90 transition inline-flex items-center gap-2"
      >
        <ShoppingBag className="size-4" />
        كمّل طلبك الآن
      </button>
    </div>
  );
}
