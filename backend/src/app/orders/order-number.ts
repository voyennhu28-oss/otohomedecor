import { randomInt } from 'node:crypto';

/** Bỏ 0/O, 1/I dễ đọc nhầm khi khách đọc mã đơn qua điện thoại. */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export const ORDER_NUMBER_REGEX = /^HD\d{6}-[2-9A-HJ-NP-Z]{6}$/;

export const generateOrderNumber = (now = new Date()) => {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  const date = [
    vn.getUTCFullYear() % 100,
    vn.getUTCMonth() + 1,
    vn.getUTCDate(),
  ]
    .map((n) => String(n).padStart(2, '0'))
    .join('');
  const suffix = Array.from(
    { length: 6 },
    () => ALPHABET[randomInt(ALPHABET.length)],
  ).join('');
  return `HD${date}-${suffix}`;
};

/**
 * Nội dung chuyển khoản (SePay): mã đơn bỏ dấu "-", vd "HD261113-7K3M9Q" → "HD2611137K3M9Q".
 * SePay chỉ nhận diện mã dạng tiền tố + chữ/số (cấu hình: tiền tố HD, hậu tố 12 ký tự số và chữ),
 * còn VietQR / ngân hàng tự bỏ ký tự đặc biệt khỏi nội dung chuyển khoản.
 */
export const toPaymentCode = (orderNumber: string) => orderNumber.replace('-', '');

const PAYMENT_CODE_IN_TEXT = /HD(\d{6})([2-9A-HJ-NP-Z]{6})/;

/**
 * Tìm mã đơn trong mã thanh toán SePay nhận diện được (`code`) hoặc nội dung chuyển khoản
 * (`content`, khách có thể gõ thêm chữ, dấu cách, viết thường). Trả về mã đơn có dấu "-" hoặc null.
 */
export const findOrderNumberInText = (text: string | null | undefined) => {
  const match = PAYMENT_CODE_IN_TEXT.exec((text ?? '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
  return match ? `HD${match[1]}-${match[2]}` : null;
};
