import type { PaymentStatus } from '@/constants/orders';
import type { AdminPaymentListItem } from '@/features/orders/types';
import { parseOption, parsePositiveInt } from '@/hooks/use-url-filters';
import { formatVND } from '@/lib/format';

export const PAYMENT_FILTER_DEFAULTS = {
  status: '',
  q: '',
  page: '1',
  size: '20',
};

export const PAYMENT_TABS = {
  '': 'Tất cả',
  failed: 'Cần đối soát',
  paid: 'Đã khớp đơn',
} as const;

export function toPaymentQuery(raw: typeof PAYMENT_FILTER_DEFAULTS) {
  const status = parseOption<PaymentStatus | ''>(
    raw.status,
    ['', 'pending', 'paid', 'failed', 'refunded'],
    '',
  );
  const q = raw.q.trim().slice(0, 100);
  return {
    status: status || undefined,
    orderNumber: q || undefined,
    page: parsePositiveInt(raw.page, 1),
    itemPerPage: Math.min(parsePositiveInt(raw.size, 20), 100),
  };
}

export function mismatchReason(payment: AdminPaymentListItem): string | null {
  if (payment.status !== 'failed') return null;
  const order = payment.order;
  if (!order) return 'Không tìm thấy đơn tương ứng';
  const diff = payment.amount - order.total;
  if (diff !== 0) {
    return `Sai số tiền: ${diff > 0 ? 'thừa' : 'thiếu'} ${formatVND(Math.abs(diff))}`;
  }
  if (order.status === 'cancelled' || order.status === 'returned') {
    return 'Tiền về khi đơn đã hủy / trả hàng';
  }
  return 'Đơn đã thanh toán trước đó (chuyển trùng)';
}

export function suggestedAction(payment: AdminPaymentListItem): string | null {
  if (payment.status !== 'failed' || !payment.order) return null;
  const order = payment.order;
  if (order.paymentStatus === 'paid') return 'Hoàn lại tiền cho khách';
  if (order.status === 'cancelled' || order.status === 'returned') {
    return 'Hoàn lại tiền cho khách';
  }
  return 'Kiểm tra rồi xác nhận đã nhận tiền hoặc hoàn tiền';
}
