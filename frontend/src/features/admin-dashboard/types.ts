import type { OrderStatus } from '@/constants/orders';

export type DashboardQuery = {
  from?: string;
  to?: string;
  lowStockThreshold?: number;
  topLimit?: number;
};

export type Dashboard = {
  range: { from: string; to: string };
  summary: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    cancelledOrders: number;
  };
  revenueByDay: { date: string; revenue: number; orders: number }[];
  ordersByStatus: Record<OrderStatus, number>;
  topProducts: {
    productID: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  needsAttention: {
    pendingOrders: number;
    failedPayments: number;
    lowStockThreshold: number;
    lowStock: {
      id: string;
      sku: string;
      name: string;
      stock: number;
      product: { id: string; name: string; slug: string };
    }[];
  };
};
