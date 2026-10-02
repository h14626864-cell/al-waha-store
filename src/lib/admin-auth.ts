import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.ADMIN_SECRET || "alwaha-store-secret-key-2025-fallback";
export const ADMIN_COOKIE = "wh_admin_session";

// إنشاء توكن موقّع صالح لمدة 7 أيام
export function createSessionToken(adminId: string): string {
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `${adminId}.${expires}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

// التحقق من التوكن وإرجاع معرف الأدمن
export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [adminId, expires, sig] = parts;
  const expected = createHmac("sha256", SECRET).update(`${adminId}.${expires}`).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  if (parseInt(expires) < Date.now()) return null;
  return adminId;
}

// قراءة جلسة الأدمن الحالية من الكوكيز
export async function getAdminId(): Promise<string | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value);
}
