const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

/** Tiền là số nguyên VND. Ví dụ: 4200000 → "4.200.000 ₫". */
export function formatVND(amount: number): string {
  return vndFormatter.format(amount);
}
