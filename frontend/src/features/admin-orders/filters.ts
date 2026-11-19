import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from '@/constants/orders';
import type {
  AdminOrderFilter,
  AdminOrderQuery,
} from '@/features/orders/types';
import { parseOption, parsePositiveInt } from '@/hooks/use-url-filters';

export const ORDER_FILTER_DEFAULTS = {
  q: '',
  by: 'orderNumber',
  status: '',
  method: '',
  payment: '',
  from: '',
  to: '',
  page: '1',
  size: '20',
};

export type OrderFilterValues = typeof ORDER_FILTER_DEFAULTS;

export const SEARCH_FIELDS = {
  orderNumber: 'Mã đơn',
  email: 'Email khách',
} as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const keys = <T extends object>(object: T) =>
  Object.keys(object) as (keyof T)[];

export function toOrderFilter(raw: OrderFilterValues): AdminOrderFilter {
  const q = raw.q.trim().slice(0, 100);
  const by = parseOption(raw.by, keys(SEARCH_FIELDS), 'orderNumber');
  const status = parseOption<OrderStatus | ''>(
    raw.status,
    ['', ...keys(ORDER_STATUSES)],
    '',
  );
  const method = parseOption<PaymentMethod | ''>(
    raw.method,
    ['', ...keys(PAYMENT_METHODS)],
    '',
  );
  const payment = parseOption<PaymentStatus | ''>(
    raw.payment,
    ['', ...keys(PAYMENT_STATUSES)],
    '',
  );
  const from = DATE.test(raw.from) ? raw.from : undefined;
  let to = DATE.test(raw.to) ? raw.to : undefined;
  if (from && to && to < from) to = undefined;

  return {
    status: status || undefined,
    paymentMethod: method || undefined,
    paymentStatus: payment || undefined,
    from,
    to,
    ...(q && (by === 'email' ? { email: q } : { orderNumber: q })),
  };
}

export function toOrderQuery(raw: OrderFilterValues): AdminOrderQuery {
  return {
    ...toOrderFilter(raw),
    page: parsePositiveInt(raw.page, 1),
    itemPerPage: Math.min(parsePositiveInt(raw.size, 20), 100),
  };
}

export function hasOrderFilters(filter: AdminOrderFilter) {
  return Object.values(filter).some((value) => value !== undefined);
}
