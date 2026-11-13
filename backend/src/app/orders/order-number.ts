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
