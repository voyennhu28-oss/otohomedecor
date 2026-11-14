import { OrderStatus, PaymentStatus, type Order } from '@prisma/client';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { toPaymentCode } from '../orders/order-number';

/** Ảnh QR VietQR nhúng được (docs.sepay.vn/tao-qr-code-vietqr-dong.html). */
const VIETQR_IMAGE_URL = 'https://vietqr.app/img';

export interface SepayAccount {
  bank: string; // mã / tên ngân hàng, vd "VCB" hoặc "Vietcombank"
  accountNumber: string;
  accountName: string | null;
}

/** Thông tin để khách chuyển khoản (trả về khi checkout, GET /me/orders/:orderNumber/payment, email). */
export interface TransferInfo extends SepayAccount {
  amount: number;
  /** Nội dung chuyển khoản BẮT BUỘC: mã đơn bỏ dấu "-" để SePay nhận diện được. */
  content: string;
  qrUrl: string;
  /** Sau thời điểm này cron hủy đơn nếu chưa nhận được tiền. */
  expiresAt: Date;
}

export const buildTransferInfo = (
  account: SepayAccount,
  order: Pick<Order, 'orderNumber' | 'total' | 'createdAt'>,
  timeoutMinutes: number,
): TransferInfo => {
  const content = toPaymentCode(order.orderNumber);
  const query = new URLSearchParams({
    acc: account.accountNumber,
    bank: account.bank,
    amount: String(order.total),
    des: content,
    template: 'compact',
  });
  return {
    ...account,
    amount: order.total,
    content,
    qrUrl: `${VIETQR_IMAGE_URL}?${query}`,
    expiresAt: new Date(order.createdAt.getTime() + timeoutMinutes * 60_000),
  };
};

/**
 * Kết quả đối chiếu 1 giao dịch tiền vào với đơn:
 *  - paid             khớp đúng số tiền, đơn chưa trả → đánh dấu đã thanh toán
 *  - amount_mismatch  chuyển thiếu / thừa → không tự xác nhận, admin xử lý
 *  - already_paid     đơn đã trả rồi (khách chuyển 2 lần) → admin hoàn tiền
 *  - order_closed     đơn đã hủy / trả hàng (vd tiền về sau khi cron hủy) → admin hoàn tiền
 */
export type TransferOutcome = 'paid' | 'amount_mismatch' | 'already_paid' | 'order_closed';

export const evaluateTransfer = (
  order: Pick<Order, 'status' | 'paymentStatus' | 'total'>,
  amount: number,
): TransferOutcome => {
  if (order.paymentStatus === PaymentStatus.paid) return 'already_paid';
  if (order.status === OrderStatus.cancelled || order.status === OrderStatus.returned) {
    return 'order_closed';
  }
  return amount === order.total ? 'paid' : 'amount_mismatch';
};

/** So sánh chuỗi bí mật không lộ thông tin qua thời gian chạy (băm trước để 2 buffer cùng độ dài). */
export const safeEqual = (a: string, b: string) =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

/** SePay: timestamp lệch quá 5 phút thì từ chối (chống gửi lại request cũ bị bắt được). */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export type SignatureCheck = 'ok' | 'missing' | 'expired' | 'invalid';

/**
 * Chữ ký HMAC-SHA256 của webhook SePay (developer.sepay.vn/vi/sepay-webhooks/xac-thuc):
 * header `X-SePay-Signature: sha256=<hex>` = HMAC-SHA256(secret, "<X-SePay-Timestamp>.<raw body>").
 * Phải ký trên BODY GỐC (bytes nhận được), không phải JSON đã parse rồi stringify lại.
 */
export const verifySepaySignature = ({
  rawBody,
  timestamp,
  signature,
  secret,
  now = Date.now(),
}: {
  rawBody: Buffer | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
  secret: string;
  now?: number;
}): SignatureCheck => {
  if (!rawBody || !signature || !timestamp || !/^\d+$/.test(timestamp)) return 'missing';
  if (Math.abs(now / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return 'expired';

  const expected = `sha256=${createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex')}`;
  return safeEqual(signature.trim(), expected) ? 'ok' : 'invalid';
};
