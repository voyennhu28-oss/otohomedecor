'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  TransactionStatusBadge,
} from '@/features/admin-orders/components/order-badges';
import {
  mismatchReason,
  suggestedAction,
} from '@/features/admin-payments/reconcile';
import type { AdminPaymentListItem } from '@/features/orders/types';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { formatDateTime, formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

export function PaymentDetailDialog({
  payment: paymentProp,
  onClose,
}: {
  payment: AdminPaymentListItem | null;
  onClose: () => void;
}) {
  const payment = useRetainedValue(paymentProp);
  const raw = payment?.rawResponse;
  const reason = payment && mismatchReason(payment);
  const action = payment && suggestedAction(payment);

  const rows: [string, React.ReactNode][] = payment
    ? [
        ['Số tiền nhận', formatVND(payment.amount)],
        ['Thời gian nhận', formatDateTime(payment.createdAt)],
        ['Mã giao dịch SePay', payment.transactionID],
        ['Ngân hàng', raw?.gateway],
        ['Giờ ngân hàng ghi', raw?.transactionDate],
        ['Số tài khoản nhận', raw?.accountNumber],
        ['Mã thanh toán nhận diện', raw?.code],
        ['Nội dung chuyển khoản', raw?.content],
        ['Mã tham chiếu', raw?.referenceCode],
      ]
    : [];

  return (
    <Dialog
      open={paymentProp !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-sm p-0 sm:max-w-xl'>
        <DialogHeader className='shrink-0 border-b px-6 pt-6 pr-14 pb-4'>
          <DialogTitle className='text-2xl'>Chi tiết giao dịch</DialogTitle>
          <DialogDescription className='flex flex-wrap items-center gap-2'>
            {payment && <TransactionStatusBadge status={payment.status} />}
            {reason}
          </DialogDescription>
        </DialogHeader>

        {payment && (
          <div className='no-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5 text-sm'>
            {action && (
              <p className='rounded-sm bg-muted/60 px-3 py-2.5'>
                <span className='font-medium'>Nên làm: </span>
                {action}.
              </p>
            )}

            <dl className='grid grid-cols-[minmax(0,10rem)_1fr] gap-x-4 gap-y-2'>
              {rows
                .filter(
                  ([, value]) =>
                    value !== undefined && value !== null && value !== '',
                )
                .map(([label, value]) => (
                  <div key={label} className='contents'>
                    <dt className='text-muted-foreground'>{label}</dt>
                    <dd className='break-all tabular-nums'>{value}</dd>
                  </div>
                ))}
            </dl>

            {payment.order && (
              <div className='rounded-sm border p-3'>
                <div className='mb-2 text-xs font-medium text-muted-foreground'>
                  Đơn hàng
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-mono font-medium'>
                    {payment.order.orderNumber}
                  </span>
                  <OrderStatusBadge status={payment.order.status} />
                  <PaymentStatusBadge status={payment.order.paymentStatus} />
                </div>
                <div className='mt-1 text-muted-foreground'>
                  Tổng đơn {formatVND(payment.order.total)}
                </div>
              </div>
            )}

            {raw && (
              <details className='rounded-sm border'>
                <summary className='cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground'>
                  Dữ liệu gốc SePay gửi
                </summary>
                <pre className='overflow-x-auto border-t bg-muted/40 px-3 py-2 font-mono text-xs leading-relaxed'>
                  {JSON.stringify(raw, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        <DialogFooter className='shrink-0 border-t bg-muted/30 px-6 py-4'>
          {payment?.order && (
            <Link
              href={`/admin/orders/${payment.order.id}`}
              className={cn(buttonVariants({ size: 'sm' }), 'rounded-sm')}
            >
              Mở đơn {payment.order.orderNumber}
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
