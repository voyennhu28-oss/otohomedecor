'use client';

import {
  Add01Icon,
  Copy01Icon,
  Delete02Icon,
  DiscountTag01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  ConfirmDialog,
  type ConfirmContent,
} from '@/components/admin/confirm-dialog';
import { DataTablePagination } from '@/components/admin/data-table-pagination';
import {
  DataTableSkeleton,
  DataTableState,
} from '@/components/admin/data-table-state';
import { SearchInput } from '@/components/admin/search-input';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  useAdminPromotions,
  useDeletePromotion,
  useUpdatePromotion,
} from '@/features/admin-promotions/hooks/use-admin-promotions';
import {
  describeDiscount,
  getPromotionState,
  PROMOTION_FILTER_DEFAULTS,
  PROMOTION_STATES,
  toPromotionQuery,
} from '@/features/admin-promotions/promotion-rules';
import type { Promotion } from '@/features/promotions/types';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { formatDateTime, formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

import {
  PromotionFormDialog,
  type PromotionFormTarget,
} from './promotion-form-dialog';

const TABS = { '': 'Tất cả', true: 'Đang bật', false: 'Tạm ngừng' } as const;

function scheduleText(promotion: Promotion) {
  const start = formatDateTime(promotion.startsAt);
  return promotion.endsAt
    ? `${start} – ${formatDateTime(promotion.endsAt)}`
    : `Từ ${start}`;
}

export function PromotionsManager() {
  const { values, setValues, reset } = useUrlFilters(PROMOTION_FILTER_DEFAULTS);
  const query = useMemo(() => toPromotionQuery(values), [values]);
  const tab = query.isActive === undefined ? '' : String(query.isActive);
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useAdminPromotions(query);
  const update = useUpdatePromotion();
  const remove = useDeletePromotion();

  const [formTarget, setFormTarget] = useState<PromotionFormTarget | null>(
    null,
  );
  const [deleting, setDeleting] = useState<Promotion | null>(null);
  const now = new Date();

  const copyCode = (code: string) =>
    navigator.clipboard
      .writeText(code)
      .then(() => toast.success(`Đã sao chép mã ${code}`))
      .catch(() => toast.error('Không sao chép được, hãy chép tay'));

  const toggleActive = (promotion: Promotion) =>
    update.mutate(
      { id: promotion.id, body: { isActive: !promotion.isActive } },
      {
        onSuccess: () =>
          toast.success(
            promotion.isActive
              ? `Đã tạm ngừng mã ${promotion.code}`
              : `Đã bật lại mã ${promotion.code}`,
          ),
        onError: (err) => toast.error(err.message),
      },
    );

  const addButton = (
    <Button
      size='sm'
      className='rounded-sm'
      onClick={() => setFormTarget({ mode: 'create' })}
    >
      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
      Tạo mã giảm giá
    </Button>
  );

  const confirmContent: ConfirmContent | null = deleting && {
    title: `Xóa mã ${deleting.code}?`,
    description:
      'Khách không dùng được mã này nữa. Đơn đã dùng mã vẫn giữ nguyên. Có thể tạo lại mã cùng tên sau khi xóa.',
    confirmLabel: 'Xóa mã',
    destructive: true,
  };

  return (
    <>
      <AdminPageHeader
        title='Khuyến mãi'
        description='Mã giảm giá khách nhập ở bước thanh toán.'
        actions={addButton}
      />

      <div className='flex flex-col gap-4'>
        <Tabs
          value={tab || 'all'}
          onValueChange={(value) =>
            setValues({ active: value === 'all' ? '' : String(value) })
          }
        >
          <TabsList variant='line' className='w-full justify-start border-b'>
            {Object.entries(TABS).map(([key, label]) => (
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
            placeholder='Tìm theo mã hoặc tên'
            label='Tìm mã giảm giá'
            className='w-full sm:w-64'
          />
          {query.q && (
            <Button
              variant='ghost'
              size='sm'
              className='rounded-sm text-muted-foreground'
              onClick={reset}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {isPending ? (
          <DataTableSkeleton label='Đang tải mã giảm giá' />
        ) : isError ? (
          <DataTableState
            title='Không tải được mã giảm giá'
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
          query.q || query.isActive !== undefined ? (
            <DataTableState
              title='Không có mã phù hợp'
              action={
                <Button
                  variant='outline'
                  size='sm'
                  className='rounded-sm'
                  onClick={reset}
                >
                  Xóa bộ lọc
                </Button>
              }
            />
          ) : (
            <DataTableState
              icon={DiscountTag01Icon}
              title='Chưa có mã giảm giá'
              description='Tạo mã như "KHACHMOI" giảm 10% cho đơn đầu, hoặc "FREESHIP" miễn phí vận chuyển.'
              action={addButton}
            />
          )
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
                      ['Mã', 'pl-4'],
                      ['Mức giảm', ''],
                      ['Lượt dùng', 'hidden md:table-cell'],
                      ['Thời gian', 'hidden xl:table-cell'],
                      ['Trạng thái', ''],
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
                    <TableHead className='h-10 w-14'>
                      <span className='sr-only'>Thao tác</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.list.map((promotion) => {
                    const state = getPromotionState(promotion, now);
                    const usage = promotion.usageLimit
                      ? Math.min(
                          (promotion.usedCount / promotion.usageLimit) * 100,
                          100,
                        )
                      : null;
                    return (
                      <TableRow
                        key={promotion.id}
                        className={cn(
                          state !== 'running' && 'text-muted-foreground',
                        )}
                      >
                        <TableCell className='max-w-0 min-w-48 py-2.5 pl-4'>
                          <button
                            type='button'
                            onClick={() =>
                              setFormTarget({ mode: 'edit', promotion })
                            }
                            className='grid min-w-0 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'
                          >
                            <span
                              className={cn(
                                'truncate font-mono text-[13px] font-semibold hover:underline',
                                state === 'running' && 'text-foreground',
                              )}
                            >
                              {promotion.code}
                            </span>
                            <span className='truncate text-xs text-muted-foreground'>
                              {promotion.name}
                            </span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <div
                            className={cn(
                              state === 'running' && 'text-foreground',
                            )}
                          >
                            {describeDiscount(promotion)}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {promotion.minOrderValue > 0
                              ? `Đơn từ ${formatVND(promotion.minOrderValue)}`
                              : 'Mọi đơn'}
                            {promotion.perUserLimit &&
                              ` · ${promotion.perUserLimit} lượt/khách`}
                          </div>
                        </TableCell>
                        <TableCell className='hidden w-40 md:table-cell'>
                          <div className='text-sm tabular-nums'>
                            {promotion.usedCount}
                            <span className='text-muted-foreground'>
                              {promotion.usageLimit
                                ? ` / ${promotion.usageLimit}`
                                : ' lượt'}
                            </span>
                          </div>
                          {usage !== null && (
                            <div
                              role='meter'
                              aria-label={`Đã dùng ${promotion.usedCount} / ${promotion.usageLimit} lượt`}
                              aria-valuemin={0}
                              aria-valuemax={promotion.usageLimit ?? 0}
                              aria-valuenow={promotion.usedCount}
                              className='mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted'
                            >
                              <div
                                className='h-full rounded-full bg-chart-1'
                                style={{ width: `${usage}%` }}
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className='hidden text-xs text-muted-foreground tabular-nums xl:table-cell'>
                          {scheduleText(promotion)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              state === 'running' ? 'secondary' : 'outline'
                            }
                            className='rounded-sm'
                          >
                            {PROMOTION_STATES[state]}
                          </Badge>
                        </TableCell>
                        <TableCell className='pr-3 text-right'>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant='ghost'
                                  size='icon-sm'
                                  className='rounded-sm text-muted-foreground'
                                  aria-label={`Thao tác với mã ${promotion.code}`}
                                  disabled={
                                    update.isPending &&
                                    update.variables?.id === promotion.id
                                  }
                                />
                              }
                            >
                              <HugeiconsIcon
                                icon={MoreHorizontalIcon}
                                strokeWidth={2}
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align='end'
                              className='w-52 rounded-sm'
                            >
                              <DropdownMenuItem
                                className='rounded-sm'
                                onClick={() =>
                                  setFormTarget({ mode: 'edit', promotion })
                                }
                              >
                                <HugeiconsIcon
                                  icon={PencilEdit02Icon}
                                  strokeWidth={1.75}
                                />
                                Sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className='rounded-sm'
                                onClick={() => copyCode(promotion.code)}
                              >
                                <HugeiconsIcon
                                  icon={Copy01Icon}
                                  strokeWidth={1.75}
                                />
                                Sao chép mã
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className='rounded-sm'
                                onClick={() => toggleActive(promotion)}
                              >
                                <HugeiconsIcon
                                  icon={
                                    promotion.isActive
                                      ? ViewOffSlashIcon
                                      : ViewIcon
                                  }
                                  strokeWidth={1.75}
                                />
                                {promotion.isActive ? 'Tạm ngừng' : 'Bật lại'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant='destructive'
                                className='rounded-sm'
                                onClick={() => setDeleting(promotion)}
                              >
                                <HugeiconsIcon
                                  icon={Delete02Icon}
                                  strokeWidth={1.75}
                                />
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
              itemLabel='mã'
              onPageChange={(page) => setValues({ page: String(page) })}
              onPageSizeChange={(size) => setValues({ size: String(size) })}
            />
          </>
        )}
      </div>

      <PromotionFormDialog
        target={formTarget}
        onClose={() => setFormTarget(null)}
      />
      <ConfirmDialog
        content={confirmContent}
        pending={remove.isPending}
        pendingLabel='Đang xóa…'
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success(`Đã xóa mã ${deleting.code}`);
              setDeleting(null);
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </>
  );
}
