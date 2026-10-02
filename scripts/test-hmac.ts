// اختبار HMAC verification لـ webhook بايموب
// يشغّل: npx tsx scripts/test-hmac.ts
import crypto from "crypto";

// نفس الدالة من lib/paymob.ts
function verifyPaymobHmac(
  obj: Record<string, unknown>,
  hmacSecret: string,
  receivedHmac: string
): boolean {
  const source = (obj.source_data || {}) as Record<string, unknown>;
  const order = (obj.order || {}) as Record<string, unknown>;

  const concatenated = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    obj.integration_id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    order.id,
    obj.owner,
    obj.pending,
    source.pan,
    source.sub_type,
    source.type,
    obj.success,
  ]
    .map((v) => (v === null || v === undefined ? "" : String(v)))
    .join("");

  const computed = crypto.createHmac("sha512", hmacSecret).update(concatenated).digest("hex");
  return computed === receivedHmac.toLowerCase();
}

// معاملة تجريبية بنفس شكل ردود بايموب الحقيقية
const txn = {
  id: 175,
  created_at: "2026-09-08T09:30:00.000000Z",
  amount_cents: 2450000,
  currency: "EGP",
  success: true,
  owner: "merchant",
  pending: false,
  error_occured: false,
  is_auth: false,
  is_capture: false,
  is_3d_secure: true,
  is_standalone_payment: true,
  is_voided: false,
  is_refunded: false,
  has_parent_transaction: false,
  integration_id: 1234567,
  order: { id: 987654321 },
  source_data: { type: "card", sub_type: "Regular", pan: "2346" },
};

const SECRET = "test_hmac_secret_2026";

// توليد التوقيع الصحيح (زي ما بايموب بيعمل)
const source = txn.source_data as Record<string, unknown>;
const concatenated = [
  txn.amount_cents, txn.created_at, txn.currency, txn.error_occured,
  txn.has_parent_transaction, txn.id, txn.integration_id, txn.is_3d_secure,
  txn.is_auth, txn.is_capture, txn.is_refunded, txn.is_standalone_payment,
  txn.is_voided, txn.order.id, txn.owner, txn.pending,
  source.pan, source.sub_type, source.type, txn.success,
].map((v) => (v === null || v === undefined ? "" : String(v))).join("");

const correctHmac = crypto.createHmac("sha512", SECRET).update(concatenated).digest("hex");

// الاختبارات
console.log("1) توقيع صحيح → يقبل:", verifyPaymobHmac(txn, SECRET, correctHmac) === true ? "✅ PASS" : "❌ FAIL");
console.log("2) توقيع مزوّر → يرفض:", verifyPaymobHmac(txn, SECRET, "a".repeat(128)) === false ? "✅ PASS" : "❌ FAIL");
console.log("3) سري غلط → يرفض:", verifyPaymobHmac(txn, "wrong_secret", correctHmac) === false ? "✅ PASS" : "❌ FAIL");
console.log("4) توقيع فاضي → يرفض:", verifyPaymobHmac(txn, SECRET, "") === false ? "✅ PASS" : "❌ FAIL");

// حالة source_data ناقص (بعض المعاملات الفاشلة)
const failedTxn = { ...txn, success: false, source_data: null };
const failedConcat = [
  failedTxn.amount_cents, failedTxn.created_at, failedTxn.currency, failedTxn.error_occured,
  failedTxn.has_parent_transaction, failedTxn.id, failedTxn.integration_id, failedTxn.is_3d_secure,
  failedTxn.is_auth, failedTxn.is_capture, failedTxn.is_refunded, failedTxn.is_standalone_payment,
  failedTxn.is_voided, failedTxn.order.id, failedTxn.owner, failedTxn.pending,
  "", "", "", failedTxn.success, // source_data فاضي
].map((v) => (v === null || v === undefined ? "" : String(v))).join("");
const failedHmac = crypto.createHmac("sha512", SECRET).update(failedConcat).digest("hex");
console.log("5) معاملة بدون source_data:", verifyPaymobHmac(failedTxn, SECRET, failedHmac) === true ? "✅ PASS" : "❌ FAIL");
