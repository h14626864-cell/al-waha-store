"use client";

import { useSyncExternalStore } from "react";

// تنسيق العملة بالجنيه المصري
export function formatEGP(amount: number): string {
  return `${new Intl.NumberFormat("en-EG", { maximumFractionDigits: 2 }).format(amount)} ج.م`;
}

// تنسيق التاريخ بالعربية
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

// الاشتراك في تغيّر الهاش — بيرجع دالة تنظيف
function subscribeHashRoute(onStoreChange: () => void) {
  const onChange = () => {
    window.scrollTo({ top: 0 });
    onStoreChange();
  };
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

// قراءة المسار الحالي من الهاش
function getHashRouteSnapshot(): string {
  return window.location.hash.replace(/^#/, "") || "/";
}

// ===== مهم جدًا لمنع hydration mismatch =====
// أثناء الـ SSR وأول رندر على العميل بنرجّع "/" في الحالتين،
// وبعد الـ hydration مباشرة React بتقارن بالقيمة الحقيقية وبتعمل re-render
// — كده مفيش أي تضارب بين HTML السيرفر ورندر العميل الأول
function getHashRouteServerSnapshot(): string {
  return "/";
}

// هوك التنقل عبر الهاش (#/product/xxx)
export function useHashRoute(): string {
  return useSyncExternalStore(subscribeHashRoute, getHashRouteSnapshot, getHashRouteServerSnapshot);
}

export function navigate(path: string) {
  window.location.hash = path;
}
