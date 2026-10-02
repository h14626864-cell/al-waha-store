"use client";

import { useState } from "react";
import { Loader2, Store, Mail, Lock, User, Phone, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { navigate } from "@/lib/shop-utils";
import { useCustomer } from "@/lib/store";

// صفحة تسجيل الدخول وإنشاء حساب جديد
export function AuthView({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const { refresh } = useCustomer();

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setField = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(isLogin ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isLogin ? { email: form.email, password: form.password } : form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isLogin ? `أهلاً بعودتك، ${data.customer.name}!` : "تم إنشاء حسابك بنجاح!");
        await refresh();
        navigate("/account");
      } else {
        setError(data.error || "حدث خطأ");
      }
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6">
      <div className="bg-card border rounded-2xl p-7 shadow-sm">
        <div className="text-center">
          <span className="inline-flex size-14 rounded-2xl bg-primary text-primary-foreground items-center justify-center">
            <Store className="size-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold">{isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {isLogin
              ? "سجّل دخولك لمتابعة طلباتك والدعم الفني"
              : "أنشئ حسابك لمتابعة حالة طلباتك بسهولة"}
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {!isLogin && (
            <>
              <AuthField icon={User} label="الاسم بالكامل">
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="مثال: أحمد محمود"
                  required
                  className={authInput}
                />
              </AuthField>
              <AuthField icon={Phone} label="رقم الهاتف (اختياري)">
                <input
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="01xxxxxxxxx"
                  inputMode="numeric"
                  maxLength={11}
                  dir="ltr"
                  className={`${authInput} text-end`}
                />
              </AuthField>
            </>
          )}

          <AuthField icon={Mail} label="البريد الإلكتروني">
            <input
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="example@mail.com"
              type="email"
              required
              dir="ltr"
              className={`${authInput} text-end`}
            />
          </AuthField>

          <AuthField icon={Lock} label="كلمة المرور">
            <input
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder="••••••••"
              type="password"
              required
              minLength={6}
              dir="ltr"
              className={`${authInput} text-end`}
            />
          </AuthField>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3.5 py-2.5 font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : isLogin ? "تسجيل الدخول" : "إنشاء الحساب"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm">
          {isLogin ? (
            <p className="text-muted-foreground">
              ليس لديك حساب؟{" "}
              <button onClick={() => navigate("/register")} className="text-primary font-bold hover:underline">
                أنشئ حسابًا جديدًا
              </button>
            </p>
          ) : (
            <p className="text-muted-foreground">
              لديك حساب بالفعل؟{" "}
              <button onClick={() => navigate("/login")} className="text-primary font-bold hover:underline">
                سجّل الدخول
              </button>
            </p>
          )}
          <button
            onClick={() => navigate("/")}
            className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="size-3.5" />
            العودة للمتجر
          </button>
        </div>
      </div>
    </div>
  );
}

const authInput =
  "w-full h-11 rounded-lg border bg-background ps-10 pe-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition placeholder:text-muted-foreground";

function AuthField({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold">{label}</label>
      <div className="relative">
        <Icon className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}
