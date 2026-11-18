import { BadRequestException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: [OrderStatus.confirmed, OrderStatus.cancelled],
  confirmed: [OrderStatus.processing, OrderStatus.cancelled],
  processing: [OrderStatus.shipping],
  shipping: [OrderStatus.delivered],
  delivered: [OrderStatus.returned],
  cancelled: [],
  returned: [],
};

export const CUSTOMER_CANCELLABLE: readonly OrderStatus[] = [
  OrderStatus.pending,
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  returned: 'Trả hàng',
};

export const canTransition = (from: OrderStatus, to: OrderStatus) =>
  ORDER_TRANSITIONS[from].includes(to);

export const assertTransition = (from: OrderStatus, to: OrderStatus) => {
  if (!canTransition(from, to)) {
    throw new BadRequestException(
      `Không thể chuyển đơn từ "${ORDER_STATUS_LABELS[from]}" sang "${ORDER_STATUS_LABELS[to]}"`,
    );
  }
};

export const statusTimestamp = (
  status: OrderStatus,
  at: Date,
): Prisma.OrderUpdateInput => {
  switch (status) {
    case OrderStatus.shipping:
      return { shippedAt: at };
    case OrderStatus.delivered:
      return { deliveredAt: at };
    case OrderStatus.cancelled:
      return { cancelledAt: at };
    default:
      return {};
  }
};
