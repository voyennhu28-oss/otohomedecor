'use client';

import {
  Alert02Icon,
  ArrowRight01Icon,
  CreditCardIcon,
  ShoppingBag01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import Link from 'next/link';

import { FormSection } from '@/components/admin/form-section';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { ORDER_STATUSES, type OrderStatus } from '@/constants/orders';
import {
  LOW_STOCK_OPTIONS,
  type DateRange,
} from '@/features/admin-dashboard/range';
import type { Dashboard } from '@/features/admin-dashboard/types';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

function MeterBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const percent =
    max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div
      role='meter'
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className='h-2 w-full overflow-hidden rounded-full bg-muted'
    >
      <div
        className='h-full rounded-full bg-chart-1 transition-[width]'
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function OrdersByStatusPanel({
  data,
  range,
}: {
  data: Dashboard['ordersByStatus'];
  range: DateRange;
}) {
  const entries = Object.entries(ORDER_STATUSES) as [OrderStatus, string][];
  const total = entries.reduce((sum, [status]) => sum + (data[status] ?? 0), 0);
  const max = Math.max(...entries.map(([status]) => data[status] ?? 0));

  return (
    <FormSection
      title='Đơn theo trạng thái'
      description={`${total} đơn đặt trong khoảng, gồm cả đơn hủy / trả hàng.`}
    >
      <ul className='flex flex-col gap-3'>
        {entries.map(([status, label]) => {
          const count = data[status] ?? 0;
          const share = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <li key={status}>
              <Link
                href={`/admin/orders?status=${status}&from=${range.from}&to=${range.to}`}
                className='group grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                <span className='truncate group-hover:underline'>{label}</span>
                <MeterBar
                  value={count}
                  max={max}
                  label={`${label}: ${count} đơn`}
                />
                <span className='w-16 text-right tabular-nums'>
                  {count}
                  <span className='ml-1 text-xs text-muted-foreground'>
                    {share}%
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </FormSection>
  );
}

export function TopProductsPanel({
  products,
}: {
  products: Dashboard['topProducts'];
}) {
  const max = Math.max(0, ...products.map((product) => product.quantity));

  return (
    <FormSection
      title='Sản phẩm bán chạy'
      description='Theo số lượng bán, không tính đơn hủy / trả hàng.'
    >
      {products.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          Chưa bán được sản phẩm nào trong khoảng này.
        </p>
      ) : (
        <ol className='flex flex-col gap-3'>
          {products.map((product, index) => (
            <li
              key={product.productID}
              className='grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-sm'
            >
              <span className='text-xs text-muted-foreground tabular-nums'>
                {index + 1}
              </span>
              <Link
                href={`/admin/products/${product.productID}`}
                className='truncate hover:underline'
                title={product.name}
              >
                {product.name}
              </Link>
              <span className='text-right tabular-nums'>
                {formatVND(product.revenue)}
              </span>
              <span />
              <MeterBar
                value={product.quantity}
                max={max}
                label={`${product.name}: ${product.quantity} sản phẩm`}
              />
              <span className='text-right text-xs text-muted-foreground tabular-nums'>
                {product.quantity} cái
              </span>
            </li>
          ))}
        </ol>
      )}
    </FormSection>
  );
}

function AttentionRow({
  icon,
  href,
  count,
  label,
  emptyLabel,
}: {
  icon: IconSvgElement;
  href: string;
  count: number;
  label: string;
  emptyLabel: string;
}) {
  return (
    <Link
      href={href}
      className='group flex items-center gap-3 rounded-sm border px-3 py-2.5 text-sm transition-colors outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring'
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-sm',
          count > 0
            ? 'bg-secondary text-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <HugeiconsIcon icon={icon} size={16} strokeWidth={1.75} />
      </span>
      <span className={cn('flex-1', count === 0 && 'text-muted-foreground')}>
        {count > 0 ? (
          <>
            <strong className='tabular-nums'>{count}</strong> {label}
          </>
        ) : (
          emptyLabel
        )}
      </span>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        size={16}
        strokeWidth={1.75}
        className='text-muted-foreground transition-transform group-hover:translate-x-0.5'
      />
    </Link>
  );
}

export function NeedsAttentionPanel({
  data,
  onLowStockChange,
}: {
  data: Dashboard['needsAttention'];
  onLowStockChange: (value: number) => void;
}) {
  return (
    <FormSection title='Cần xử lý'>
      <div className='flex flex-col gap-2'>
        <AttentionRow
          icon={ShoppingBag01Icon}
          href='/admin/orders?status=pending'
          count={data.pendingOrders}
          label='đơn chờ xác nhận'
          emptyLabel='Không có đơn chờ xác nhận'
        />
        <AttentionRow
          icon={CreditCardIcon}
          href='/admin/payments?status=failed'
          count={data.failedPayments}
          label='giao dịch cần đối soát (trong khoảng)'
          emptyLabel='Không có giao dịch cần đối soát'
        />
      </div>

      <div className='flex flex-col gap-3 border-t pt-4'>
        <div className='flex items-center justify-between gap-2'>
          <p className='flex items-center gap-1.5 text-sm font-medium'>
            <HugeiconsIcon
              icon={Alert02Icon}
              size={16}
              strokeWidth={1.75}
              className='text-muted-foreground'
            />
            Sắp hết hàng
          </p>
          <NativeSelect
            size='sm'
            value={String(data.lowStockThreshold)}
            onChange={(event) => onLowStockChange(Number(event.target.value))}
            aria-label='Ngưỡng sắp hết hàng'
            className='[&_select]:rounded-sm'
          >
            {LOW_STOCK_OPTIONS.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {value === 0 ? 'Hết hàng' : `Còn ≤ ${value}`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {data.lowStock.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            Không có biến thể nào{' '}
            {data.lowStockThreshold === 0
              ? 'hết hàng'
              : `còn ≤ ${data.lowStockThreshold}`}
            .
          </p>
        ) : (
          <ul className='-my-1 divide-y text-sm'>
            {data.lowStock.map((variant) => (
              <li key={variant.id}>
                <Link
                  href={`/admin/products/${variant.product.id}?tab=variants`}
                  className='flex items-center gap-3 py-2 hover:underline'
                >
                  <span className='grid min-w-0 flex-1'>
                    <span className='truncate'>{variant.name}</span>
                    <span className='truncate font-mono text-xs text-muted-foreground'>
                      {variant.sku}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 tabular-nums',
                      variant.stock === 0 && 'font-medium text-destructive',
                    )}
                  >
                    {variant.stock === 0 ? 'Hết hàng' : `Còn ${variant.stock}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className='text-xs text-muted-foreground'>
          Chỉ tính biến thể đang bán của sản phẩm đang bán, không gồm hàng đặt
          làm.
        </p>
      </div>
    </FormSection>
  );
}
