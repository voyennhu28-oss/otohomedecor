import type { Order, ShippingAddress, User } from '@prisma/client';
import { ORDER_STATUS_LABELS } from './order-status';

export const ORDER_EXCEL_COLUMNS = [
  'orderNumber',
  'createdAt',
  'status',
  'customerEmail',
  'customerName',
  'receiver',
  'phone',
  'address',
  'items',
  'subtotal',
  'shippingFee',
  'assemblyFee',
  'discount',
  'total',
  'promotionCode',
  'paymentMethod',
  'paymentStatus',
  'note',
] as const;

type ExportOrder = Order & { user: Pick<User, 'email' | 'fullName'> | null };

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  dateStyle: 'short',
  timeStyle: 'short',
});

export const formatAddress = (a: ShippingAddress) =>
  [a.street, a.ward, a.district, a.province].filter(Boolean).join(', ');

/** Mỗi đơn 1 dòng; các sản phẩm gộp thành "SKU x số lượng; ...". */
export const toOrderExcelRows = (orders: ExportOrder[]) =>
  orders.map((o) => ({
    orderNumber: o.orderNumber,
    createdAt: dateFormat.format(o.createdAt),
    status: ORDER_STATUS_LABELS[o.status],
    customerEmail: o.user?.email ?? '',
    customerName: o.user?.fullName ?? '',
    receiver: o.shippingAddress.fullName,
    phone: o.shippingAddress.phone,
    address: formatAddress(o.shippingAddress),
    items: o.items.map((i) => `${i.sku} x${i.quantity}`).join('; '),
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    assemblyFee: o.assemblyFee,
    discount: o.discount,
    total: o.total,
    promotionCode: o.promotionCode ?? '',
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    note: o.note ?? '',
  }));
