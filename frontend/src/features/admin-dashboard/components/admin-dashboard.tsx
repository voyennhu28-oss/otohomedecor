'use client';

import { useMemo } from 'react';

import { DataTableState } from '@/components/admin/data-table-state';
import { StatTile } from '@/components/admin/stat-tile';
import { FormAlert } from '@/components/form-alert';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminDashboard } from '@/features/admin-dashboard/hooks/use-admin-dashboard';
import {
  DASHBOARD_FILTER_DEFAULTS,
  LOW_STOCK_OPTIONS,
  percentChange,
  previousRange,
  RANGE_PRESETS,
  rangeLabel,
  resolveRange,
  type RangePreset,
} from '@/features/admin-dashboard/range';
import { parsePositiveInt, useUrlFilters } from '@/hooks/use-url-filters';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

import {
  NeedsAttentionPanel,
  OrdersByStatusPanel,
  TopProductsPanel,
} from './dashboard-panels';
import { RevenueChart } from './revenue-chart';

export function AdminDashboard() {
  const { values, setValues } = useUrlFilters(DASHBOARD_FILTER_DEFAULTS);
  const { preset, range, invalid } = useMemo(
    () => resolveRange(values),
    [values],
  );
  const previous = useMemo(() => previousRange(range), [range]);
  const lowRaw = values.low === '0' ? 0 : parsePositiveInt(values.low, 5);
  const lowStockThreshold = (LOW_STOCK_OPTIONS as readonly number[]).includes(
    lowRaw,
  )
    ? lowRaw
    : 5;

  const current = useAdminDashboard({
    from: range.from,
    to: range.to,
    lowStockThreshold,
    topLimit: 8,
  });
  const before = useAdminDashboard({
    from: previous.from,
    to: previous.to,
    lowStockThreshold: 0,
    topLimit: 1,
  });

  const data = current.data;
  const prev = before.data?.summary;
  const comparedTo = `${previous.days} ngày trước đó`;
  const change = (key: keyof NonNullable<typeof prev>) =>
    data && prev ? percentChange(data.summary[key], prev[key]) : undefined;
  const loadingTiles = !data;

  const choosePreset = (next: RangePreset) => {
    if (next === 'custom') {
      setValues({ range: 'custom', from: range.from, to: range.to });
    } else {
      setValues({ range: next, from: '', to: '' });
    }
  };

  return (
    <>
      <AdminPageHeader
        title='Bảng điều khiển'
        description={`Số liệu ${rangeLabel(range)} (${range.days} ngày).`}
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <div
              role='group'
              aria-label='Khoảng thời gian'
              className='flex flex-wrap rounded-sm border p-0.5'
            >
              {(Object.entries(RANGE_PRESETS) as [RangePreset, string][]).map(
                ([key, label]) => (
                  <Button
                    key={key}
                    type='button'
                    variant='ghost'
                    size='xs'
                    aria-pressed={preset === key}
                    onClick={() => choosePreset(key)}
                    className='rounded-sm aria-pressed:bg-muted aria-pressed:text-foreground'
                  >
                    {label}
                  </Button>
                ),
              )}
            </div>
            {preset === 'custom' && (
              <div className='flex items-center gap-1.5 text-sm text-muted-foreground'>
                <label htmlFor='dashboard-from' className='sr-only'>
                  Từ ngày
                </label>
                <Input
                  id='dashboard-from'
                  type='date'
                  value={values.from}
                  max={values.to || undefined}
                  onChange={(event) => setValues({ from: event.target.value })}
                  className='h-8 w-36 rounded-sm text-sm'
                />
                <span aria-hidden>–</span>
                <label htmlFor='dashboard-to' className='sr-only'>
                  Đến ngày
                </label>
                <Input
                  id='dashboard-to'
                  type='date'
                  value={values.to}
                  min={values.from || undefined}
                  onChange={(event) => setValues({ to: event.target.value })}
                  className='h-8 w-36 rounded-sm text-sm'
                />
              </div>
            )}
          </div>
        }
      />

      {invalid && (
        <FormAlert className='mb-4'>
          {invalid}. Đang hiện 30 ngày gần nhất.
        </FormAlert>
      )}

      {current.isError && !data ? (
        <DataTableState
          title='Không tải được số liệu'
          description={current.error.message}
          action={
            <Button
              variant='outline'
              size='sm'
              className='rounded-sm'
              onClick={() => current.refetch()}
            >
              Thử lại
            </Button>
          }
        />
      ) : (
        <div className='flex flex-col gap-6'>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            <StatTile
              label='Doanh thu'
              value={data ? formatVND(data.summary.revenue) : ''}
              change={change('revenue')}
              comparedTo={comparedTo}
              loading={loadingTiles}
            />
            <StatTile
              label='Số đơn'
              value={data ? data.summary.orders.toLocaleString('vi-VN') : ''}
              change={change('orders')}
              comparedTo={comparedTo}
              loading={loadingTiles}
            />
            <StatTile
              label='Giá trị trung bình mỗi đơn'
              value={data ? formatVND(data.summary.averageOrderValue) : ''}
              change={change('averageOrderValue')}
              comparedTo={comparedTo}
              loading={loadingTiles}
            />
            <StatTile
              label='Đơn hủy'
              value={
                data ? data.summary.cancelledOrders.toLocaleString('vi-VN') : ''
              }
              change={change('cancelledOrders')}
              upIsGood={false}
              comparedTo={comparedTo}
              loading={loadingTiles}
            />
          </div>

          {!data ? (
            <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]'>
              <Skeleton className='h-96 rounded-sm' />
              <Skeleton className='h-96 rounded-sm' />
            </div>
          ) : (
            <div
              className={cn(
                'grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]',
                current.isPlaceholderData && 'opacity-60 transition-opacity',
              )}
            >
              <div className='flex min-w-0 flex-col gap-6'>
                <RevenueChart
                  days={data.revenueByDay}
                  loading={current.isFetching && current.isPlaceholderData}
                />
                <div className='grid gap-6 lg:grid-cols-2'>
                  <OrdersByStatusPanel
                    data={data.ordersByStatus}
                    range={range}
                  />
                  <TopProductsPanel products={data.topProducts} />
                </div>
              </div>
              <NeedsAttentionPanel
                data={data.needsAttention}
                onLowStockChange={(value) => setValues({ low: String(value) })}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
