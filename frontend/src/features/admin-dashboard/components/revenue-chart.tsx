'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { FormSection } from '@/components/admin/form-section';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  formatCompactVND,
  toRevenuePoints,
  type RevenuePoint,
} from '@/features/admin-dashboard/chart-data';
import type { Dashboard } from '@/features/admin-dashboard/types';
import { formatVND } from '@/lib/format';

const config = {
  revenue: { label: 'Doanh thu', color: 'var(--chart-1)' },
} satisfies ChartConfig;

export function RevenueChart({
  days,
  loading,
}: {
  days: Dashboard['revenueByDay'];
  loading: boolean;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const { points, grouping } = toRevenuePoints(days);
  const empty = points.every((point) => point.revenue === 0);
  const best = points.reduce<RevenuePoint | null>(
    (top, point) => (!top || point.revenue > top.revenue ? point : top),
    null,
  );

  return (
    <FormSection
      title={
        grouping === 'week' ? 'Doanh thu theo tuần' : 'Doanh thu theo ngày'
      }
      description={
        empty
          ? 'Chưa có doanh thu trong khoảng này.'
          : best &&
            `Cao nhất ${formatVND(best.revenue)} (${best.tooltip}). Không tính đơn hủy / trả hàng.`
      }
      actions={
        <div
          role='group'
          aria-label='Kiểu hiển thị'
          className='flex rounded-sm border p-0.5'
        >
          {(
            [
              ['chart', 'Biểu đồ'],
              ['table', 'Bảng'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type='button'
              variant='ghost'
              size='xs'
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className='rounded-sm aria-pressed:bg-muted aria-pressed:text-foreground'
            >
              {label}
            </Button>
          ))}
        </div>
      }
      className={loading ? 'opacity-60 transition-opacity' : undefined}
    >
      {view === 'chart' ? (
        <ChartContainer
          config={config}
          className='aspect-auto h-72 w-full'
          role='img'
          aria-label={`Biểu đồ doanh thu ${grouping === 'week' ? 'theo tuần' : 'theo ngày'}`}
        >
          <BarChart
            data={points}
            margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke='var(--border)' />
            <XAxis
              dataKey='label'
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={formatCompactVND}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)' }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as RevenuePoint | undefined;
                if (!active || !point) return null;
                return (
                  <div className='grid min-w-40 gap-1 rounded-sm border bg-background px-3 py-2 text-xs shadow-md'>
                    <div className='font-medium'>{point.tooltip}</div>
                    <div className='flex items-center justify-between gap-4'>
                      <span className='flex items-center gap-1.5 text-muted-foreground'>
                        <span
                          aria-hidden
                          className='size-2 rounded-[2px] bg-(--color-revenue)'
                        />
                        Doanh thu
                      </span>
                      <span className='font-medium tabular-nums'>
                        {formatVND(point.revenue)}
                      </span>
                    </div>
                    <div className='flex justify-between gap-4 text-muted-foreground'>
                      <span className='pl-3.5'>Số đơn</span>
                      <span className='tabular-nums'>{point.orders}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey='revenue'
              fill='var(--color-revenue)'
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              minPointSize={0}
            />
          </BarChart>
        </ChartContainer>
      ) : (
        <div className='no-scrollbar max-h-72 overflow-y-auto rounded-sm border'>
          <table className='w-full text-sm'>
            <thead className='sticky top-0 bg-muted text-xs text-muted-foreground'>
              <tr>
                <th className='px-3 py-2 text-left font-medium'>
                  {grouping === 'week' ? 'Tuần' : 'Ngày'}
                </th>
                <th className='px-3 py-2 text-right font-medium'>Số đơn</th>
                <th className='px-3 py-2 text-right font-medium'>Doanh thu</th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {[...points].reverse().map((point) => (
                <tr key={point.key}>
                  <td className='px-3 py-1.5 tabular-nums'>{point.tooltip}</td>
                  <td className='px-3 py-1.5 text-right tabular-nums'>
                    {point.orders}
                  </td>
                  <td className='px-3 py-1.5 text-right tabular-nums'>
                    {formatVND(point.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FormSection>
  );
}
