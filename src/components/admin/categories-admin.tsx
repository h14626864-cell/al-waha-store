"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, FolderTree } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Category } from "@/lib/types";

export function CategoriesAdmin() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", description: "", image: "", sortOrder: "0" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    if (data.success) setCategories(data.categories);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", image: "", sortOrder: String(categories.length + 1) });
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description || "",
      image: c.image || "",
      sortOrder: String(c.sortOrder),
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("أدخل اسم التصنيف");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/admin/categories/${editing.id}` : "/api/admin/categories",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(editing ? "تم تعديل التصنيف" : "تم إضافة التصنيف");
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
    const res = await fetch(`/api/admin/categories/${deleting.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("تم حذف التصنيف");
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
          <h1 className="text-2xl font-bold">التصنيفات</h1>
          <p className="text-sm text-muted-foreground mt-1">تنظيم منتجات المتجر في أقسام</p>
        </div>
        <button
          onClick={openAdd}
          className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition flex items-center justify-center gap-2"
        >
          <Plus className="size-4" />
          إضافة تصنيف
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {categories.map((c) => (
            <div key={c.id} className="bg-card border rounded-xl overflow-hidden">
              <div className="h-28 relative bg-muted">
                {c.image && (
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <p className="absolute bottom-2.5 start-3.5 text-white font-bold">{c.name}</p>
                <p className="absolute bottom-2.5 end-3.5 text-white/70 text-xs price-num">
                  {c._count?.products ?? 0} منتج
                </p>
              </div>
              <div className="p-3.5">
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-8 leading-relaxed">
                  {c.description || "بدون وصف"}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => openEdit(c)}
                    className="flex-1 h-8.5 rounded-lg border text-xs font-bold hover:bg-accent transition flex items-center justify-center gap-1.5"
                  >
                    <Pencil className="size-3" />
                    تعديل
                  </button>
                  <button
                    onClick={() => setDeleting(c)}
                    className="flex-1 h-8.5 rounded-lg border text-xs font-bold text-destructive hover:bg-destructive/10 transition flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="size-3" />
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة الإضافة/التعديل */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</DialogTitle>
            <DialogDescription>
              التصنيفات تظهر في قائمة المتجر والصفحة الرئيسية
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">اسم التصنيف *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: إلكترونيات"
                className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">الوصف</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">رابط صورة الغلاف</label>
              <input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                dir="ltr"
                placeholder="https://..."
                className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">ترتيب الظهور</label>
              <input
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value.replace(/[^\d]/g, "") })}
                inputMode="numeric"
                dir="ltr"
                className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 text-end"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editing ? "حفظ" : "إضافة"}
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
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="size-5 text-destructive" />
              تأكيد حذف التصنيف
            </DialogTitle>
            <DialogDescription>
              حذف التصنيف "{deleting?.name}"؟ لن يمكنك الحذف إذا كان يحتوي على منتجات.
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
