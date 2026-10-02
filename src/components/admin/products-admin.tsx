"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, Loader2, Star, PackageX, Flame, X, Palette, Ruler, TimerReset } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { formatEGP } from "@/lib/shop-utils";
import { isFlashActive } from "@/lib/pricing";
import { toast } from "sonner";
import type { Product, Category } from "@/lib/types";

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  comparePrice: "",
  image: "",
  categoryId: "",
  stock: "10",
  brand: "",
  featured: false,
  isNew: true,
  sizes: "", // نص مفصول بفواصل: S, M, L, XL
  salePrice: "", // سعر عرض الفلاش (فاضي = مفيش عرض)
  saleEndsAt: "", // تاريخ انتهاء العرض — datetime-local
};

// تحويل تاريخ لحالة حقل datetime-local (بتوقيت الجهاز المحلي)
function toLocalInput(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// مدة عرض سريعة بالساعات من الآن
function hoursFromNow(hours: number): string {
  return toLocalInput(new Date(Date.now() + hours * 60 * 60 * 1000));
}

export function ProductsAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [colors, setColors] = useState<{ name: string; hex: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const load = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([
      fetch(`/api/admin/products?search=${encodeURIComponent(search)}`),
      fetch("/api/admin/categories"),
    ]);
    const [pData, cData] = await Promise.all([pRes.json(), cRes.json()]);
    if (pData.success) setProducts(pData.products);
    if (cData.success) setCategories(cData.categories);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id || "" });
    setColors([]);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      comparePrice: p.comparePrice ? String(p.comparePrice) : "",
      image: p.image,
      categoryId: p.categoryId,
      stock: String(p.stock),
      brand: p.brand || "",
      featured: p.featured,
      isNew: p.isNew,
      sizes: (p.sizes || []).join("، "),
      salePrice: p.salePrice ? String(p.salePrice) : "",
      saleEndsAt: toLocalInput(p.saleEndsAt),
    });
    setColors((p.colors as { name: string; hex: string }[] | null) || []);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.price || !form.image.trim() || !form.categoryId) {
      toast.error("املأ الحقول المطلوبة: الاسم، السعر، الصورة، التصنيف");
      return;
    }
    setSaving(true);
    try {
      // عرض فلاش بدون تاريخ انتهاء → نذكّر ونحدد يوم تلقائيًا
      if (form.salePrice && !form.saleEndsAt) {
        toast.error("حددي مدة العرض — اضغطي «يوم واحد» أو اختاري تاريخ النهاية");
        setSaving(false);
        return;
      }
      if (form.salePrice && form.salePrice !== "" && Number(form.salePrice) >= Number(form.price)) {
        toast.error("سعر العرض لازم يكون أقل من السعر الأصلي");
        setSaving(false);
        return;
      }
      const url = editing ? `/api/admin/products/${editing.id}` : "/api/admin/products";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, colors }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editing ? "تم تعديل المنتج" : "تم إضافة المنتج");
        setDialogOpen(false);
        load();
      } else {
        toast.error(data.error || "حدث خطأ");
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const res = await fetch(`/api/admin/products/${deleting.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("تم حذف المنتج");
      load();
    } else {
      toast.error(data.error || "حدث خطأ");
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">المنتجات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {products.length} منتج في المتجر
          </p>
        </div>
        <button
          onClick={openAdd}
          className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition flex items-center justify-center gap-2"
        >
          <Plus className="size-4" />
          إضافة منتج
        </button>
      </div>

      {/* البحث */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الماركة..."
          className="w-full h-10 rounded-lg border bg-card ps-10 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {/* الجدول */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <PackageX className="size-10 text-muted-foreground/30 mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">لا توجد منتجات مطابقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-xs text-muted-foreground border-b bg-accent/40">
                  <th className="text-start py-3 ps-4 font-medium">المنتج</th>
                  <th className="text-start py-3 font-medium">التصنيف</th>
                  <th className="text-start py-3 font-medium">السعر</th>
                  <th className="text-start py-3 font-medium">المخزون</th>
                  <th className="text-start py-3 font-medium">مبيعات</th>
                  <th className="text-start py-3 font-medium">مميز</th>
                  <th className="text-start py-3 pe-4 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-accent/20 transition">
                    <td className="py-3 ps-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="size-11 rounded-lg object-cover border shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold line-clamp-1 max-w-52">{p.name}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {p.brand && (
                              <p className="text-[11px] text-muted-foreground">{p.brand}</p>
                            )}
                            {(p.sizes || []).length > 0 && (
                              <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5">
                                {(p.sizes || []).length} مقاس
                              </span>
                            )}
                            {(p.colors as unknown[] | null)?.length ? (
                              <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5">
                                {(p.colors as unknown[]).length} لون
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{p.category?.name}</td>
                    <td className="py-3">
                      {isFlashActive(p) ? (
                        <>
                          <p className="price-num font-bold text-destructive">{formatEGP(p.salePrice!)}</p>
                          <p className="price-num text-[11px] text-muted-foreground line-through">{formatEGP(p.price)}</p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 mt-0.5">
                            <Flame className="size-2.5" />
                            عرض فلاش
                          </span>
                        </>
                      ) : (
                        <>
                          <p className="price-num font-bold text-primary">{formatEGP(p.price)}</p>
                          {p.comparePrice && (
                            <p className="price-num text-[11px] text-muted-foreground line-through">
                              {formatEGP(p.comparePrice)}
                            </p>
                          )}
                        </>
                      )}
                    </td>
                    <td className="py-3">
                      <span
                        className={`price-num font-bold ${
                          p.stock === 0
                            ? "text-destructive"
                            : p.stock <= 5
                              ? "text-amber-600"
                              : "text-foreground"
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="py-3 price-num">{p.soldCount}</td>
                    <td className="py-3">
                      {p.featured ? (
                        <Star className="size-4 fill-brass text-brass" />
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="py-3 pe-4">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openEdit(p)}
                          className="size-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition"
                          aria-label="تعديل"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleting(p)}
                          className="size-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive transition"
                          aria-label="حذف"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة الإضافة/التعديل */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
            <DialogDescription>
              {editing ? "حدّث بيانات المنتج ثم احفظ التغييرات" : "املأ بيانات المنتج الجديد"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">اسم المنتج *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="مثال: آيفون 15 برو 128 جيجا"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">الوصف</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">السعر (ج.م) *</label>
                <input
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, "") })}
                  inputMode="decimal"
                  dir="ltr"
                  className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 text-end"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">السعر قبل الخصم</label>
                <input
                  value={form.comparePrice}
                  onChange={(e) =>
                    setForm({ ...form, comparePrice: e.target.value.replace(/[^\d.]/g, "") })
                  }
                  inputMode="decimal"
                  dir="ltr"
                  className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 text-end"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">التصنيف *</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">المخزون</label>
                <input
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value.replace(/[^\d]/g, "") })}
                  inputMode="numeric"
                  dir="ltr"
                  className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 text-end"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">رابط الصورة *</label>
              <input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                dir="ltr"
                placeholder="https://..."
                className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
              {form.image && (
                <img
                  src={form.image}
                  alt="معاينة"
                  className="mt-2 size-20 rounded-lg object-cover border"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">الماركة</label>
              <input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="Apple, Samsung..."
                className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>

            {/* ============ خيارات المنتج: المقاسات ============ */}
            <div className="rounded-xl border bg-accent/30 p-4 space-y-3">
              <p className="text-sm font-bold flex items-center gap-1.5">
                <Ruler className="size-4 text-primary" />
                المقاسات المتاحة
              </p>
              <input
                value={form.sizes}
                onChange={(e) => setForm({ ...form, sizes: e.target.value })}
                placeholder="مثال: S، M، L، XL أو 38، 39، 40، 41 — اكتبيهم مفصولين بفاصلة"
                className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                سيبّي الحقل فاضي لو المنتج ملوش مقاسات. العميل هيختار مقاس واحد قبل الإضافة للسلة.
              </p>
            </div>

            {/* ============ خيارات المنتج: الألوان ============ */}
            <div className="rounded-xl border bg-accent/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold flex items-center gap-1.5">
                  <Palette className="size-4 text-primary" />
                  الألوان المتاحة
                </p>
                <button
                  type="button"
                  onClick={() => setColors([...colors, { name: "", hex: "#000000" }])}
                  disabled={colors.length >= 20}
                  className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition disabled:opacity-40 flex items-center gap-1"
                >
                  <Plus className="size-3.5" />
                  إضافة لون
                </button>
              </div>
              {colors.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  سيبها فاضية لو المنتج لونه واحد. زوّدي ألوان العميل هيختار منها مع عرض اللون نفسه.
                </p>
              ) : (
                <div className="space-y-2">
                  {colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(c.hex) ? c.hex : "#000000"}
                        onChange={(e) =>
                          setColors(colors.map((cc, j) => (j === i ? { ...cc, hex: e.target.value } : cc)))
                        }
                        className="size-10 rounded-lg border cursor-pointer bg-background p-1 shrink-0"
                        aria-label="لون العرض"
                      />
                      <input
                        value={c.name}
                        onChange={(e) =>
                          setColors(colors.map((cc, j) => (j === i ? { ...cc, name: e.target.value } : cc)))
                        }
                        placeholder="اسم اللون — أسود، أبيض، بيج..."
                        maxLength={30}
                        className="flex-1 h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                      />
                      <button
                        type="button"
                        onClick={() => setColors(colors.filter((_, j) => j !== i))}
                        className="size-10 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive transition shrink-0"
                        aria-label="حذف اللون"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ============ عرض الفلاش (سعر مؤقت بمؤقت تنازلي) ============ */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
              <p className="text-sm font-bold flex items-center gap-1.5 text-amber-800">
                <Flame className="size-4" />
                عرض فلاش — سعر مخفض مؤقت
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">سعر العرض (ج.م)</label>
                  <input
                    value={form.salePrice}
                    onChange={(e) => setForm({ ...form, salePrice: e.target.value.replace(/[^\d.]/g, "") })}
                    inputMode="decimal"
                    dir="ltr"
                    placeholder="0.00"
                    className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 text-end"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">ينتهي في</label>
                  <input
                    type="datetime-local"
                    value={form.saleEndsAt}
                    onChange={(e) => setForm({ ...form, saleEndsAt: e.target.value })}
                    dir="ltr"
                    className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "يوم واحد", h: 24 },
                  { label: "3 أيام", h: 72 },
                  { label: "أسبوع", h: 168 },
                ].map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => setForm({ ...form, saleEndsAt: hoursFromNow(q.h) })}
                    className="h-8 px-3 rounded-full border bg-background text-xs font-semibold hover:border-amber-400 hover:text-amber-700 transition flex items-center gap-1"
                  >
                    <TimerReset className="size-3" />
                    {q.label}
                  </button>
                ))}
                {form.salePrice && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, salePrice: "", saleEndsAt: "" })}
                    className="h-8 px-3 rounded-full bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition"
                  >
                    إلغاء العرض — رجّع السعر الأصلي
                  </button>
                )}
              </div>
              <p className="text-[11px] text-amber-700/90 leading-relaxed">
                بعد وقت النهاية السعر بيرجع تلقائيًا للسعر الأصلي في كل صفحات المتجر — من غير أي خطوة إضافية.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <span className="text-sm font-semibold">منتج مميز (يظهر في المختارات)</span>
              <Switch
                checked={form.featured}
                onCheckedChange={(v) => setForm({ ...form, featured: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <span className="text-sm font-semibold">وصل حديثًا</span>
              <Switch
                checked={form.isNew}
                onCheckedChange={(v) => setForm({ ...form, isNew: v })}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editing ? "حفظ التغييرات" : "إضافة المنتج"}
              </button>
              <button
                onClick={() => setDialogOpen(false)}
                className="h-11 px-5 rounded-xl border font-semibold text-sm hover:bg-accent"
              >
                إلغاء
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* تأكيد الحذف */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تأكيد حذف المنتج</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف "{deleting?.name}"؟ لا يمكن التراجع عن هذه الخطوة.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <button
              onClick={confirmDelete}
              className="flex-1 h-10 rounded-xl bg-destructive text-white font-bold text-sm hover:bg-destructive/90"
            >
              نعم، احذف
            </button>
            <button
              onClick={() => setDeleting(null)}
              className="flex-1 h-10 rounded-xl border font-semibold text-sm hover:bg-accent"
            >
              إلغاء
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
