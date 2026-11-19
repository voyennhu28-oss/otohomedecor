export const ORDER_STATUSES = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  returned: 'Trả hàng',
} as const;

export type OrderStatus = keyof typeof ORDER_STATUSES;

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipping'],
  shipping: ['delivered'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

export const ORDER_ACTION_LABELS: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Xác nhận đơn',
  processing: 'Bắt đầu chuẩn bị',
  shipping: 'Giao cho vận chuyển',
  delivered: 'Đã giao xong',
  cancelled: 'Hủy đơn',
  returned: 'Ghi nhận trả hàng',
};

export const PAYMENT_METHODS = {
  cod: 'COD',
  bank_transfer: 'Chuyển khoản',
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const PAYMENT_STATUSES = {
  pending: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán lỗi',
  refunded: 'Đã hoàn tiền',
} as const;

export type PaymentStatus = keyof typeof PAYMENT_STATUSES;

export const TRANSACTION_STATUSES: Record<PaymentStatus, string> = {
  pending: 'Đang xử lý',
  paid: 'Đã khớp đơn',
  failed: 'Cần đối soát',
  refunded: 'Đã hoàn tiền',
};
