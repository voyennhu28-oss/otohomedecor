import { ORDER_TRANSITIONS, type OrderStatus } from '@/constants/orders';
import type { Order } from '@/features/orders/types';

type OrderLike = Pick<
  Order,
  | 'status'
  | 'paymentMethod'
  | 'paymentStatus'
  | 'items'
  | 'promotionCode'
  | 'total'
>;

export function getNextStatuses(order: Pick<Order, 'status'>) {
  const next = ORDER_TRANSITIONS[order.status];
  return {
    primary: next.find((status) => status !== 'cancelled') ?? null,
    canCancel: next.includes('cancelled'),
    all: next,
  };
}

export function isClosed(order: Pick<Order, 'status'>) {
  return order.status === 'cancelled' || order.status === 'returned';
}

export function canMarkPaid(order: OrderLike) {
  return (
    order.paymentMethod === 'bank_transfer' &&
    order.paymentStatus !== 'paid' &&
    !isClosed(order)
  );
}

export function transitionEffects(order: OrderLike, target: OrderStatus) {
  const effects: string[] = [];
  const paid = order.paymentStatus === 'paid';

  if (target === 'confirmed') {
    if (order.paymentMethod === 'bank_transfer' && !paid) {
      effects.push(
        'Đơn chuyển khoản này chưa nhận tiền. Nếu khách đã chuyển, dùng "Xác nhận đã nhận tiền" để ghi nhận thanh toán.',
      );
    }
  }
  if (target === 'cancelled') {
    const reserved = order.items
      .filter((item) => item.stockReserved)
      .reduce((sum, item) => sum + item.quantity, 0);
    if (reserved > 0) effects.push(`Hoàn lại kho ${reserved} sản phẩm.`);
    if (order.promotionCode) {
      effects.push(`Trả lại 1 lượt dùng mã ${order.promotionCode}.`);
    }
    if (paid) {
      effects.push(
        'Đơn đã thanh toán sẽ chuyển sang "Đã hoàn tiền". Nhớ hoàn tiền cho khách.',
      );
    }
    effects.push('Khách nhận email báo đơn đã hủy.');
  }
  if (target === 'shipping') {
    effects.push('Ghi nhận thời điểm giao cho vận chuyển, khách nhận email.');
  }
  if (target === 'delivered') {
    effects.push('Cộng vào số đã bán của sản phẩm.');
    if (order.paymentMethod === 'cod' && !paid) {
      effects.push('Đơn COD được đánh dấu đã thanh toán.');
    }
  }
  if (target === 'returned') {
    effects.push(
      'Trừ lại số đã bán. Kho KHÔNG tự cộng lại: kiểm hàng rồi nhập kho ở trang sản phẩm.',
    );
    if (paid) {
      effects.push(
        'Đơn đã thanh toán sẽ chuyển sang "Đã hoàn tiền". Nhớ hoàn tiền cho khách.',
      );
    }
  }
  return effects;
}

export function formatAddress(address: Order['shippingAddress']) {
  return [address.street, address.ward, address.district, address.province]
    .filter(Boolean)
    .join(', ');
}
