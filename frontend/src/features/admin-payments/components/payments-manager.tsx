'use client';

import { CreditCardIcon, FilterRemoveIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { DataTablePagination } from '@/components/admin/data-table-pagination';
import {
  DataTableSkeleton,
  DataTableState,
} from '@/components/admin/data-table-state';
import { SearchInput } from '@/components/admin/search-input';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PaymentStatusBadge,
  TransactionStatusBadge,
} from '@/features/admin-orders/components/order-badges';
import { useAdminPayments } from '@/features/admin-orders/hooks/use-admin-orders';
import {
  mismatchReason,
  PAYMENT_FILTER_DEFAULTS,
  PAYMENT_TABS,
  toPaymentQuery,
} from '@/features/admin-payments/reconcile';
import type { AdminPaymentListItem } from '@/features/orders/types';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { formatDateTime, formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

import { PaymentDetailDialog } from './payment-detail-dialog';

export function PaymentsManager() {
  const { values, setValues, reset } = useUrlFilters(PAYMENT_FILTER_DEFAULTS);
  const query = useMemo(() => toPaymentQuery(values), [values]);
  const tab = query.status && query.status in PAYMENT_TABS ? query.status : '';
  const [viewing, setViewing] = useState<AdminPaymentListItem | null>(null);

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useAdminPayments(query);

  return (
    <>
      <AdminPageHeader
        title='Thanh toán'
        description='Giao dịch chuyển khoản SePay báo về. "Cần đối soát" là tiền đã vào tài khoản nhưng không tự áp được vào đơn.'
      />

      <div className='flex flex-col gap-4'>
        <Tabs
          value={tab || 'all'}
          onValueChange={(value) =>
            setValues({ status: value === 'all' ? '' : String(value) })
          }
        >
          <TabsList variant='line' className='w-full justify-start border-b'>
            {Object.entries(PAYMENT_TABS).map(([key, label]) => (
              <TabsTrigger
                key={key || 'all'}
                value={key || 'all'}
                className='flex-none px-3'
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className='flex flex-wrap items-center gap-2'>
          <SearchInput
            value={values.q}
            onChange={(q) => setValues({ q })}
            placeholder='Tìm theo mã đơn'
            label='Tìm giao dịch theo mã đơn'
            className='w-full sm:w-64'
          />
          {query.orderNumber && (
            <Button
              variant='ghost'
              size='sm'
              className='rounded-sm text-muted-foreground'
              onClick={reset}
            >
              <HugeiconsIcon icon={FilterRemoveIcon} strokeWidth={1.75} />
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {isPending ? (
          <DataTableSkeleton label='Đang tải giao dịch' />
        ) : isError ? (
          <DataTableState
            title='Không tải được giao dịch'
            description={error.message}
            action={
              <Button
                variant='outline'
                size='sm'
                className='rounded-sm'
                onClick={() => refetch()}
              >
                Thử lại
              </Button>
            }
          />
        ) : data.list.length === 0 ? (
          <DataTableState
            icon={query.orderNumber ? undefined : CreditCardIcon}
            title={
              query.orderNumber
                ? `Không có giao dịch nào của đơn khớp "${query.orderNumber}"`
                : query.status === 'failed'
                  ? 'Không có giao dịch cần đối soát'
                  : 'Chưa có giao dịch nào'
            }
            description={
              query.status === 'failed' && !query.orderNumber
                ? 'Mọi khoản chuyển khoản đều đã khớp đơn.'
                : undefined
            }
          />
        ) : (
          <>
            <div
              className={cn(
                'overflow-hidden rounded-sm border transition-opacity',
                isFetching && isPlaceholderData && 'opacity-60',
              )}
            >
              <Table>
                <TableHeader className='bg-muted/50'>
                  <TableRow className='hover:bg-transparent'>
                    {[
                      ['Thời gian', 'pl-4'],
                      ['Số tiền', 'text-right'],
                      ['Đơn hàng', ''],
                      ['Nội dung chuyển khoản', 'hidden lg:table-cell'],
                      ['Kết quả', 'pr-4'],
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
                  {data.list.map((payment) => {
                    const reason = mismatchReason(payment);
                    return (
                      <TableRow
                        key={payment.id}
                        onClick={() => setViewing(payment)}
                        className='cursor-pointer'
                      >
                        <TableCell className='py-2.5 pl-4 text-muted-foreground tabular-nums'>
                          {formatDateTime(payment.createdAt)}
                        </TableCell>
                        <TableCell className='text-right font-medium tabular-nums'>
                          {formatVND(payment.amount)}
                        </TableCell>
                        <TableCell>
                          {payment.order ? (
                            <>
                              <Link
                                href={`/admin/orders/${payment.order.id}`}
                                onClick={(event) => event.stopPropagation()}
                                className='font-mono text-[13px] font-medium hover:underline'
                              >
                                {payment.order.orderNumber}
                              </Link>
                              <div className='mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
                                <span className='tabular-nums'>
                                  {formatVND(payment.order.total)}
                                </span>
                                <PaymentStatusBadge
                                  status={payment.order.paymentStatus}
                                  className='h-4 px-1 text-[10px]'
                                />
                              </div>
                            </>
                          ) : (
                            <span className='text-muted-foreground'>—</span>
                          )}
                        </TableCell>
                        <TableCell className='hidden max-w-64 lg:table-cell'>
                          <div className='truncate'>
                            {payment.rawResponse?.content || '—'}
                          </div>
                          <div className='truncate text-xs text-muted-foreground'>
                            {[
                              payment.rawResponse?.gateway,
                              `Mã GD ${payment.transactionID}`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </TableCell>
                        <TableCell className='pr-4'>
                          <TransactionStatusBadge status={payment.status} />
                          {reason && (
                            <div className='mt-1 text-xs text-muted-foreground'>
                              {reason}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination
              page={query.page}
              pageSize={query.itemPerPage}
              totalItems={data.totalItems}
              totalPages={data.totalPages}
              itemLabel='giao dịch'
              onPageChange={(page) => setValues({ page: String(page) })}
              onPageSizeChange={(size) => setValues({ size: String(size) })}
            />
          </>
        )}
      </div>

      <PaymentDetailDialog payment={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
