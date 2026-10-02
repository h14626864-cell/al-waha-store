"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Megaphone, Plus, Trash2, Pencil, Loader2, ImagePlus, X, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Banner } from "@/lib/types";
import { toast } from "sonner";

// إدارة البانرات والإعلانات من لوحة التحكم
export function BannersAdmin() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    image: "",
    link: "",
    ctaText: "",
    placement: "HERO",
    sortOrder: "0",
    active: true,
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/banners");
      const data = await res.json();
      if (data.success) setBanners(data.banners);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({ title: "", subtitle: "", image: "", link: "", ctaText: "", placement: "HERO", sortOrder: "0", active: true });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title,
      subtitle: b.subtitle || "",
      image: b.image || "",
      link: b.link || "",
      ctaText: b.ctaText || "",
      placement: b.placement,
      sortOrder: String(b.sortOrder),
      active: b.active,
    });
    setShowForm(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setForm((f) => ({ ...f, image: data.url }));
        toast.success("تم رفع الصورة");
      } else {
        toast.error(data.error || "فشل رفع الصورة");
      }
    } catch {
      toast.error("فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (form.title.trim().length < 2) {
      toast.error("أدخل عنوان البانر");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/admin/banners/${editing.id}` : "/api/admin/banners";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editing ? "تم تحديث البانر" : "تم إنشاء البانر");
        resetForm();
        load();
      } else {
        toast.error(data.error || "فشل الحفظ");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (b: Banner) => {
    await fetch(`/api/admin/banners/${b.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !b.active }),
    });
    load();
  };

  const remove = async (b: Banner) => {
    if (!confirm(`حذف البانر "${b.title}"؟`)) return;
    await fetch(`/api/admin/banners/${b.id}`, { method: "DELETE" });
    toast.success("تم الحذف");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="size-5 text-primary" />
            البانرات والإعلانات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            أضف إعلانات وصور ترويجية تظهر في المتجر — هيرو، شريط إعلان، أو صناديق ترويجية
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditing(null);
            setForm({ title: "", subtitle: "", image: "", link: "", ctaText: "", placement: "HERO", sortOrder: "0", active: true });
          }}
          className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="size-4" />
          بانر جديد
        </button>
      </div>

      {/* نموذج الإضافة/التعديل */}
      {showForm && (
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{editing ? "تعديل البانر" : "بانر جديد"}</h2>
            <button onClick={resetForm} className="size-8 rounded-lg hover:bg-accent flex items-center justify-center" aria-label="إغلاق">
              <X className="size-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="العنوان *">
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={admInput} placeholder="مثال: تخفيضات الصيف" />
            </Field>
            <Field label="الوصف الفرعي">
              <input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} className={admInput} placeholder="خصومات حتى 50%" />
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="الموضع">
              <Select value={form.placement} onValueChange={(v) => setForm((f) => ({ ...f, placement: v }))}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HERO">الهيرو الرئيسي (كاروسيل)</SelectItem>
                  <SelectItem value="STRIP">شريط إعلان أعلى الرئيسية</SelectItem>
                  <SelectItem value="PROMO">صندوق ترويجي بالرئيسية</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="الرابط عند الضغط">
              <input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} className={admInput} dir="ltr" placeholder="/category/electronics" />
            </Field>
            <Field label="نص الزر">
              <input value={form.ctaText} onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))} className={admInput} placeholder="تسوّق الآن" />
            </Field>
          </div>

          {/* الصورة */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">صورة البانر (تُرفع أو رابط)</label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="h-11 px-4 rounded-lg border text-sm font-semibold hover:bg-accent flex items-center gap-2 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                {uploading ? "جاري الرفع..." : "رفع صورة"}
              </button>
              <input
                value={form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                className={`${admInput} flex-1 min-w-48`}
                dir="ltr"
                placeholder="/uploads/... أو رابط صورة"
              />
              {form.image && (
                <img src={form.image} alt="معاينة" className="size-14 rounded-lg object-cover border" />
              )}
            </div>
            {form.placement === "HERO" && (
              <p className="text-xs text-muted-foreground">
                للهيرو: صورة عرضية كبيرة (مقاس مثالي 1600×700). بدون صورة هيستخدم خلفية متجر افتراضية.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
              <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
              ظاهر في المتجر
            </label>
            <div className="flex gap-2">
              <button onClick={resetForm} className="h-10 px-5 rounded-xl border text-sm font-bold hover:bg-accent">
                إلغاء
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 flex items-center gap-2 disabled:opacity-60"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editing ? "حفظ التعديلات" : "إنشاء البانر"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* قائمة البانرات */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">جاري التحميل...</div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card">
          <Megaphone className="size-12 text-muted-foreground/40 mx-auto" />
          <p className="mt-3 font-bold">لا توجد بانرات بعد</p>
          <p className="text-sm text-muted-foreground mt-1">أضف أول إعلان ليك وهو هيظهر في المتجر فورًا</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="bg-card border rounded-xl p-4 flex items-center gap-4">
              <img
                src={b.image || "/hero_banner1.png"}
                alt={b.title}
                className="size-14 rounded-lg object-cover border shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm">{b.title}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent">
                    {b.placement === "HERO" ? "هيرو" : b.placement === "STRIP" ? "شريط" : "ترويجي"}
                  </span>
                  {!b.active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      مخفي
                    </span>
                  )}
                </div>
                {b.subtitle && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.subtitle}</p>}
              </div>
              <button
                onClick={() => toggleActive(b)}
                className="size-9 rounded-lg border flex items-center justify-center hover:bg-accent"
                aria-label={b.active ? "إخفاء" : "إظهار"}
              >
                {b.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
              <button
                onClick={() => openEdit(b)}
                className="size-9 rounded-lg border flex items-center justify-center hover:bg-accent"
                aria-label="تعديل"
              >
                <Pencil className="size-4" />
              </button>
              <button
                onClick={() => remove(b)}
                className="size-9 rounded-lg border text-destructive flex items-center justify-center hover:bg-destructive/10"
                aria-label="حذف"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const admInput =
  "w-full h-11 rounded-lg border bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition placeholder:text-muted-foreground";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}
