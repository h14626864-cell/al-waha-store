// أنواع البيانات المشتركة في المتجر
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  sortOrder: number;
  _count?: { products: number };
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number | null;
  image: string;
  categoryId: string;
  category?: { name: string; slug: string };
  stock: number;
  rating: number;
  reviewsCount: number;
  featured: boolean;
  isNew: boolean;
  brand?: string | null;
  soldCount: number;
  sizes?: string[];
  colors?: ProductColor[] | null;
  salePrice?: number | null;
  saleEndsAt?: string | null;
  createdAt: string;
  reviews?: Review[];
  images?: ProductImage[];
  variants?: ProductVariant[];
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string | null;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  type: string;
  price?: number | null;
  stock: number;
  sku?: string | null;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface OrderItem {
  id?: string;
  productId?: string | null;
  productName: string;
  image?: string | null;
  price: number;
  quantity: number;
  size?: string | null;
  color?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email?: string | null;
  city: string;
  address: string;
  notes?: string | null;
  paymentMethod: string;
  status: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode?: string | null;
  createdAt: string;
  items: OrderItem[];
  payments?: PaymentInfo[];
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
  createdAt: string;
}

export interface AdminInfo {
  id: string;
  name: string;
  email: string;
}

export interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  link?: string | null;
  ctaText?: string | null;
  placement: string; // HERO | STRIP | PROMO
  active: boolean;
  sortOrder: number;
}

export interface TicketMessage {
  id: string;
  sender: string; // CUSTOMER | ADMIN
  body: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  name: string;
  email: string;
  subject: string;
  orderNumber?: string | null;
  status: string; // OPEN | REPLIED | CLOSED
  messages: TicketMessage[];
  createdAt: string;
}

export interface PaymentInfo {
  id: string;
  provider: string;
  amount: number;
  status: string;
  reference?: string | null;
  cardLast4?: string | null;
  createdAt: string;
}

// إعدادات المتجر العامة (الاسم واللوجو وطرق الدفع)
export interface StoreSettings {
  store_name: string;
  store_name_en: string;
  store_tagline: string;
  store_logo: string;
  store_email: string;
  store_address: string;
  announcement: string;
  support_phone: string;
  shipping_fee: string;
  free_shipping_threshold: string;
  shipping_rates: Record<string, number>; // سعر الشحن لكل محافظة
  offers_countdown_end: string; // نهاية العروض (مؤقت تنازلي) — فاضي = نهاية اليوم تلقائيًا
  store_whatsapp: string; // رقم واتساب المتجر (للزر العائم)
  social_facebook: string;
  social_instagram: string;
  social_tiktok: string;
  card_payment_enabled: boolean;
  cod_enabled: boolean;
  card_on_delivery_enabled: boolean;
  vodafone_enabled: boolean;
}

// حالات الطلب بالعربية
export const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "قيد المراجعة", color: "bg-amber-100 text-amber-800 border-amber-200" },
  CONFIRMED: { label: "تم التأكيد", color: "bg-blue-50 text-blue-700 border-blue-200" },
  SHIPPED: { label: "قيد الشحن", color: "bg-purple-50 text-purple-700 border-purple-200" },
  DELIVERED: { label: "تم التوصيل", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "ملغي", color: "bg-red-50 text-red-700 border-red-200" },
};

export const PAYMENT_METHODS: Record<string, string> = {
  COD: "الدفع عند الاستلام",
  CARD: "بطاقة بنكية عبر Paymob",
  VODAFONE_CASH: "محفظة إلكترونية",
  CARD_ON_DELIVERY: "بطاقة عند الاستلام",
};

export const TICKET_STATUS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "مفتوحة", color: "bg-amber-100 text-amber-800 border-amber-200" },
  REPLIED: { label: "تم الرد", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CLOSED: { label: "مقفولة", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

// ============ السلات المتروكة ============
// عناصر السلة المتروكة (لقطة وقت الالتقاط)
export interface AbandonedCartItem {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  quantity: number;
  size?: string | null;
  color?: string | null;
}

export interface AbandonedCartInfo {
  id: string;
  token: string;
  customerName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  items: AbandonedCartItem[];
  subtotal: number;
  status: string; // OPEN | RECOVERED | EXPIRED
  remindersSent: number;
  lastReminderAt?: string | null;
  lastChannel?: string | null;
  createdAt: string;
  updatedAt: string;
}
