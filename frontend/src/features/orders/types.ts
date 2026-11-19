import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@/constants/orders';

export type OrderItem = {
  productID: string;
  variantID: string;
  name: string;
  variantName: string | null;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  assemblyFee: number;
  stockReserved: boolean;
};

export type ShippingAddress = {
  fullName: string;
  phone: string;
  province: string;
  district: string | null;
  ward: string;
  street: string;
};

export type OrderStatusLog = {
  status: OrderStatus;
  note: string | null;
  changedBy: string | null;
  at: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  userID: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  note: string | null;
  subtotal: number;
  shippingFee: number;
  assemblyFee: number;
  discount: number;
  total: number;
  promotionCode: string | null;
  promotionID: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  statusHistory: OrderStatusLog[];
  cancelReason: string | null;
  expectedDeliveryAt: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderCustomer = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
};

export type SepayPayload = {
  id?: number;
  gateway?: string | null;
  transactionDate?: string | null;
  accountNumber?: string | null;
  code?: string | null;
  content?: string | null;
  transferType?: 'in' | 'out';
  transferAmount?: number;
  referenceCode?: string | null;
  description?: string | null;
  [key: string]: unknown;
};

export type Payment = {
  id: string;
  orderID: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  transactionID: string;
  rawResponse: SepayPayload | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrderListItem = Order & { user: OrderCustomer | null };

export type AdminOrderDetail = Order & {
  user: OrderCustomer | null;
  payments: Payment[];
};

export type PaymentOrderRef = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
};

export type AdminPaymentListItem = Payment & { order: PaymentOrderRef | null };

export type AdminOrderFilter = {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  from?: string;
  to?: string;
  orderNumber?: string;
  email?: string;
};

export type AdminOrderQuery = AdminOrderFilter & {
  page?: number;
  itemPerPage?: number;
};

export type AdminPaymentQuery = {
  status?: PaymentStatus;
  orderNumber?: string;
  page?: number;
  itemPerPage?: number;
};
