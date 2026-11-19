'use client';

import {
  ArrowLeft01Icon,
  Cancel01Icon,
  Image01Icon,
  MoneyReceive02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import {
  DataTableSkeleton,
  DataTableState,
} from '@/components/admin/data-table-state';
import { FormSection } from '@/components/admin/form-section';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  ORDER_ACTION_LABELS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
} from '@/constants/orders';
import { useAdminOrder } from '@/features/admin-orders/hooks/use-admin-orders';
import {
  canMarkPaid,
  formatAddress,
  getNextStatuses,
  isClosed,
} from '@/features/admin-orders/order-actions';
import type { AdminOrderDetail, OrderItem } from '@/features/orders/types';
import { ApiError } from '@/lib/api-client';
import { formatDate, formatDateTime, formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

import {
  OrderStatusBadge,
  PaymentStatusBadge,
  TransactionStatusBadge,
} from './order-badges';
import {
  OrderActionDialog,
  type OrderDialogTarget,
} from './order-action-dialog';

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isPending, isError, error, refetch } = useAdminOrder(id);
  const [target, setTarget] = useState<OrderDialogTarget | null>(null);

  if (isPending)
    return <DataTableSkeleton label='Đang tải đơn hàng' rows={4} />;

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <DataTableState
        title={notFound ? 'Không tìm thấy đơn hàng' : 'Không tải được đơn hàng'}
        description={notFound ? 'Đơn không tồn tại.' : error.message}
        action={
          notFound ? (
            <Link
              href='/admin/orders'
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'rounded-sm',
              )}
            >
              Về danh sách đơn
            </Link>
          ) : (
            <Button
              variant='outline'
              size='sm'
              className='rounded-sm'
              onClick={() => refetch()}
            >
              Thử lại
            </Button>
          )
        }
      />
    );
  }

  const next = getNextStatuses(order);
  const showMarkPaid = canMarkPaid(order);

  return (
    <>
      <Link
        href='/admin/orders'
        className='mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.75} />
        Đơn hàng
      </Link>

      <div className='mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div className='min-w-0'>
          <h1 className='text-3xl leading-tight'>
            Đơn <span className='font-mono text-2xl'>{order.orderNumber}</span>
          </h1>
          <div className='mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
            <span>Đặt lúc {formatDateTime(order.createdAt)}</span>
          </div>
        </div>

        {isClosed(order) ? (
          <p className='text-sm text-muted-foreground'>
            Đơn đã {order.status === 'cancelled' ? 'hủy' : 'trả hàng'}, không
            còn thao tác.
          </p>
        ) : (
          <div className='flex flex-wrap gap-2'>
            {next.canCancel && (
              <Button
                variant='ghost'
                size='sm'
                className='rounded-sm text-destructive hover:bg-destructive/10 hover:text-destructive'
                onClick={() =>
                  setTarget({ kind: 'status', status: 'cancelled' })
                }
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.75} />
                Hủy đơn
              </Button>
            )}
            {showMarkPaid && (
              <Button
                variant='outline'
                size='sm'
                className='rounded-sm'
                onClick={() => setTarget({ kind: 'mark-paid' })}
              >
                <HugeiconsIcon icon={MoneyReceive02Icon} strokeWidth={1.75} />
                Xác nhận đã nhận tiền
              </Button>
            )}
            {next.primary && (
              <Button
                size='sm'
                className='rounded-sm'
                onClick={() =>
                  next.primary &&
                  setTarget({ kind: 'status', status: next.primary })
                }
              >
                {ORDER_ACTION_LABELS[next.primary]}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]'>
        <div className='flex min-w-0 flex-col gap-6'>
          <ItemsSection order={order} />
          {order.paymentMethod === 'bank_transfer' && (
            <TransactionsSection order={order} />
          )}
        </div>
        <div className='flex min-w-0 flex-col gap-6'>
          <CustomerSection order={order} />
          <PaymentSection order={order} />
          <HistorySection order={order} />
        </div>
      </div>

      <OrderActionDialog
        order={order}
        target={target}
        onClose={() => setTarget(null)}
      />
    </>
  );
}

function ItemsSection({ order }: { order: AdminOrderDetail }) {
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <FormSection
      title={`Sản phẩm (${quantity})`}
      description='Tên, giá, ảnh lưu tại thời điểm đặt, không đổi theo sản phẩm hiện tại.'
    >
      <ul className='-my-2 divide-y'>
        {order.items.map((item) => (
          <ItemRow key={`${item.variantID}-${item.sku}`} item={item} />
        ))}
      </ul>
      <dl className='flex flex-col gap-1.5 border-t pt-4 text-sm'>
        <SummaryRow label='Tạm tính' value={formatVND(order.subtotal)} />
        <SummaryRow
          label='Phí vận chuyển'
          value={formatVND(order.shippingFee)}
        />
        {order.assemblyFee > 0 && (
          <SummaryRow
            label='Phí lắp đặt'
            value={formatVND(order.assemblyFee)}
          />
        )}
        {order.discount > 0 && (
          <SummaryRow
            label={
              order.promotionCode
                ? `Giảm giá (${order.promotionCode})`
                : 'Giảm giá'
            }
            value={`−${formatVND(order.discount)}`}
          />
        )}
        <div className='mt-1.5 flex items-baseline justify-between border-t pt-3'>
          <dt className='font-medium'>Tổng cộng</dt>
          <dd className='text-lg font-semibold tabular-nums'>
            {formatVND(order.total)}
          </dd>
        </div>
      </dl>
    </FormSection>
  );
}

function ItemRow({ item }: { item: OrderItem }) {
  return (
    <li className='flex gap-3 py-3'>
      <span className='flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground'>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt='' className='size-full object-cover' />
        ) : (
          <HugeiconsIcon icon={Image01Icon} size={18} strokeWidth={1.5} />
        )}
      </span>
      <div className='min-w-0 flex-1'>
        <Link
          href={`/admin/products/${item.productID}`}
          className='line-clamp-2 text-sm font-medium hover:underline'
        >
          {item.name}
        </Link>
        <div className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
          {item.variantName && <span>{item.variantName}</span>}
          <span className='font-mono'>{item.sku}</span>
          {!item.stockReserved && (
            <Badge
              variant='outline'
              className='h-4 rounded-sm px-1 text-[10px]'
            >
              Đặt làm
            </Badge>
          )}
        </div>
        {item.assemblyFee > 0 && (
          <div className='mt-0.5 text-xs text-muted-foreground'>
            Phí lắp đặt {formatVND(item.assemblyFee)}
          </div>
        )}
      </div>
      <div className='shrink-0 text-right text-sm tabular-nums'>
        <div className='font-medium'>{formatVND(item.lineTotal)}</div>
        <div className='text-xs text-muted-foreground'>
          {formatVND(item.unitPrice)} × {item.quantity}
        </div>
      </div>
    </li>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex justify-between gap-4'>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='tabular-nums'>{value}</dd>
    </div>
  );
}

function TransactionsSection({ order }: { order: AdminOrderDetail }) {
  return (
    <FormSection
      title='Giao dịch chuyển khoản'
      description='Tiền SePay báo về cho đơn này, mới nhất trước.'
    >
      {order.payments.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          Chưa nhận giao dịch nào cho đơn này.
        </p>
      ) : (
        <ul className='-my-2 divide-y text-sm'>
          {order.payments.map((payment) => {
            const diff = payment.amount - order.total;
            return (
              <li
                key={payment.id}
                className='flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between'
              >
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='font-medium tabular-nums'>
                      {formatVND(payment.amount)}
                    </span>
                    <TransactionStatusBadge status={payment.status} />
                    {diff !== 0 && (
                      <span className='text-xs text-destructive'>
                        {diff > 0 ? 'Thừa' : 'Thiếu'}{' '}
                        {formatVND(Math.abs(diff))}
                      </span>
                    )}
                  </div>
                  <div className='mt-0.5 text-xs break-all text-muted-foreground'>
                    {[
                      payment.rawResponse?.gateway,
                      `Mã GD ${payment.transactionID}`,
                      payment.rawResponse?.content,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <span className='shrink-0 text-xs text-muted-foreground tabular-nums'>
                  {formatDateTime(payment.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </FormSection>
  );
}

function CustomerSection({ order }: { order: AdminOrderDetail }) {
  const address = order.shippingAddress;
  return (
    <FormSection title='Khách hàng & giao hàng'>
      {order.user && (
        <div className='text-sm'>
          <div className='font-medium'>{order.user.fullName}</div>
          <a
            href={`mailto:${order.user.email}`}
            className='text-muted-foreground hover:text-foreground hover:underline'
          >
            {order.user.email}
          </a>
          {order.user.phone && (
            <div className='text-muted-foreground'>{order.user.phone}</div>
          )}
        </div>
      )}
      <div className={cn('text-sm', order.user && 'border-t pt-4')}>
        <div className='mb-1 text-xs font-medium text-muted-foreground'>
          Người nhận
        </div>
        <div className='font-medium'>{address.fullName}</div>
        <a
          href={`tel:${address.phone}`}
          className='text-muted-foreground hover:text-foreground hover:underline'
        >
          {address.phone}
        </a>
        <p className='mt-1'>{formatAddress(address)}</p>
        {order.expectedDeliveryAt && (
          <p className='mt-2 text-xs text-muted-foreground'>
            Dự kiến giao: {formatDate(order.expectedDeliveryAt)}
          </p>
        )}
      </div>
      {order.note && (
        <div className='border-t pt-4 text-sm'>
          <div className='mb-1 text-xs font-medium text-muted-foreground'>
            Ghi chú của khách
          </div>
          <p className='whitespace-pre-line'>{order.note}</p>
        </div>
      )}
    </FormSection>
  );
}

function PaymentSection({ order }: { order: AdminOrderDetail }) {
  const rows: [string, string | null][] = [
    ['Phương thức', PAYMENT_METHODS[order.paymentMethod]],
    ['Đã thanh toán lúc', order.paidAt && formatDateTime(order.paidAt)],
    ['Giao vận chuyển', order.shippedAt && formatDateTime(order.shippedAt)],
    ['Giao xong', order.deliveredAt && formatDateTime(order.deliveredAt)],
    ['Hủy lúc', order.cancelledAt && formatDateTime(order.cancelledAt)],
  ];
  return (
    <FormSection title='Thanh toán & mốc thời gian'>
      <dl className='flex flex-col gap-1.5 text-sm'>
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className='flex justify-between gap-4'>
              <dt className='text-muted-foreground'>{label}</dt>
              <dd className='text-right tabular-nums'>{value}</dd>
            </div>
          ))}
      </dl>
      {order.cancelReason && (
        <div className='border-t pt-4 text-sm'>
          <div className='mb-1 text-xs font-medium text-muted-foreground'>
            Lý do hủy
          </div>
          <p className='whitespace-pre-line'>{order.cancelReason}</p>
        </div>
      )}
    </FormSection>
  );
}

function HistorySection({ order }: { order: AdminOrderDetail }) {
  const history = [...order.statusHistory].reverse();
  return (
    <FormSection title='Lịch sử trạng thái'>
      <ol className='relative flex flex-col gap-4 border-l pl-5'>
        {history.map((log, index) => (
          <li key={`${log.at}-${index}`} className='relative text-sm'>
            <span
              aria-hidden
              className={cn(
                'absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background',
                index === 0 ? 'bg-foreground' : 'bg-foreground/30',
              )}
            />
            <div className='font-medium'>{ORDER_STATUSES[log.status]}</div>
            <div className='text-xs text-muted-foreground tabular-nums'>
              {formatDateTime(log.at)}
              {log.changedBy && ` · ${changedByLabel(log.changedBy)}`}
            </div>
            {log.note && (
              <p className='mt-1 whitespace-pre-line text-muted-foreground'>
                {log.note}
              </p>
            )}
          </li>
        ))}
      </ol>
    </FormSection>
  );
}

function changedByLabel(changedBy: string) {
  if (changedBy === 'system') return 'Hệ thống (tự hủy khi quá hạn)';
  if (changedBy === 'sepay') return 'SePay (nhận tiền tự động)';
  return changedBy;
}
