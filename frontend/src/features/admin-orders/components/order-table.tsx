'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PAYMENT_METHODS } from '@/constants/orders';
import type { AdminOrderListItem } from '@/features/orders/types';
import { formatDateTime, formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

import { OrderStatusBadge, PaymentStatusBadge } from './order-badges';

export function OrderTable({
  orders,
  fetching,
}: {
  orders: AdminOrderListItem[];
  fetching: boolean;
}) {
  const router = useRouter();

  return (
    <div
      className={cn(
        'overflow-hidden rounded-sm border transition-opacity',
        fetching && 'opacity-60',
      )}
      aria-busy={fetching}
    >
      <Table>
        <TableHeader className='bg-muted/50'>
          <TableRow className='hover:bg-transparent'>
            {[
              ['Đơn hàng', 'pl-4'],
              ['Khách hàng', 'hidden md:table-cell'],
              ['Ngày đặt', 'hidden lg:table-cell'],
              ['Tổng tiền', 'text-right'],
              ['Thanh toán', 'hidden sm:table-cell'],
              ['Trạng thái', 'pr-4'],
            ].map(([label, className]) => (
              <TableHead
                key={label}
                className={cn(
                  'h-10 text-xs font-medium text-muted-foreground',
                  className,
                )}
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const href = `/admin/orders/${order.id}`;
            const itemCount = order.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );
            return (
              <TableRow
                key={order.id}
                onClick={() => router.push(href)}
                className='cursor-pointer'
              >
                <TableCell className='py-2.5 pl-4'>
                  <Link
                    href={href}
                    onClick={(event) => event.stopPropagation()}
                    className='font-mono text-[13px] font-medium hover:underline'
                  >
                    {order.orderNumber}
                  </Link>
                  <div className='text-xs text-muted-foreground'>
                    {itemCount} sản phẩm
                    <span className='lg:hidden'>
                      {' · '}
                      {formatDateTime(order.createdAt)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className='hidden max-w-56 md:table-cell'>
                  <div className='truncate'>
                    {order.user?.fullName ?? order.shippingAddress.fullName}
                  </div>
                  <div className='truncate text-xs text-muted-foreground'>
                    {order.user?.email ?? order.shippingAddress.phone}
                  </div>
                </TableCell>
                <TableCell className='hidden text-muted-foreground tabular-nums lg:table-cell'>
                  {formatDateTime(order.createdAt)}
                </TableCell>
                <TableCell className='text-right font-medium tabular-nums'>
                  {formatVND(order.total)}
                </TableCell>
                <TableCell className='hidden sm:table-cell'>
                  <div className='flex flex-col items-start gap-1'>
                    <PaymentStatusBadge status={order.paymentStatus} />
                    <span className='text-xs text-muted-foreground'>
                      {PAYMENT_METHODS[order.paymentMethod]}
                    </span>
                  </div>
                </TableCell>
                <TableCell className='pr-4'>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
