const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export function formatVND(amount: number): string {
  return vndFormatter.format(amount);
}
