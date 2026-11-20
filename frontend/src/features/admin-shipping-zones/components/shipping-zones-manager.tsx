'use client';

import {
  Add01Icon,
  Alert02Icon,
  Delete02Icon,
  DeliveryTruck01Icon,
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
import {
  DataTableSkeleton,
  DataTableState,
} from '@/components/admin/data-table-state';
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
import {
  useAdminShippingZones,
  useDeleteShippingZone,
  useUpdateShippingZone,
} from '@/features/admin-shipping-zones/hooks/use-admin-shipping-zones';
import {
  conflictMessage,
  coverage,
  describeFee,
  provinceOwners,
} from '@/features/admin-shipping-zones/zone-rules';
import type { ShippingZone } from '@/features/shipping-zones/types';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

import { ZoneFormDialog, type ZoneFormTarget } from './zone-form-dialog';

const VISIBLE_PROVINCES = 4;

export function ShippingZonesManager() {
  const {
    data: zones,
    isPending,
    isError,
    error,
    refetch,
  } = useAdminShippingZones();
  const update = useUpdateShippingZone();
  const remove = useDeleteShippingZone();
  const [formTarget, setFormTarget] = useState<ZoneFormTarget | null>(null);
  const [deleting, setDeleting] = useState<ShippingZone | null>(null);
  const stats = useMemo(() => coverage(zones ?? []), [zones]);

  const toggleActive = (zone: ShippingZone) => {
    if (!zone.isActive) {
      const message = conflictMessage(
        zone.provinces,
        provinceOwners(zones ?? [], zone.id),
      );
      if (message) {
        toast.error(`Chưa bật được: ${message}`);
        return;
      }
    }
    update.mutate(
      { id: zone.id, body: { isActive: !zone.isActive } },
      {
        onSuccess: () =>
          toast.success(
            zone.isActive
              ? `Đã tắt vùng "${zone.name}"`
              : `Đã bật vùng "${zone.name}"`,
          ),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const addButton = (
    <Button
      size='sm'
      className='rounded-sm'
      onClick={() => setFormTarget({ mode: 'create' })}
      disabled={!zones}
    >
      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
      Thêm vùng
    </Button>
  );

  const confirmContent: ConfirmContent | null = deleting && {
    title: `Xóa vùng "${deleting.name}"?`,
    description: `Xóa hẳn, không khôi phục được. ${deleting.isActive ? `${deleting.provinces.length} tỉnh trong vùng sẽ không đặt hàng được nếu không có vùng khác nhận. ` : ''}Đơn cũ đã lưu phí ship nên không ảnh hưởng.`,
    confirmLabel: 'Xóa vùng',
    destructive: true,
  };

  return (
    <>
      <AdminPageHeader
        title='Vùng giao hàng'
        description='Tỉnh giao được và biểu phí vận chuyển theo vùng.'
        actions={addButton}
      />

      {isPending ? (
        <DataTableSkeleton label='Đang tải vùng giao hàng' rows={4} />
      ) : isError ? (
        <DataTableState
          title='Không tải được vùng giao hàng'
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
      ) : (
        <div className='flex flex-col gap-6'>
          <section
            aria-label='Độ phủ giao hàng'
            className='flex flex-col gap-3 rounded-sm border p-4'
          >
            <div className='flex flex-wrap items-baseline justify-between gap-2'>
              <p className='text-sm'>
                Giao được{' '}
                <strong className='text-lg font-semibold'>
                  {stats.covered}
                </strong>{' '}
                / {stats.total} tỉnh, thành
              </p>
              {stats.uncovered.length === 0 && (
                <span className='text-xs text-muted-foreground'>
                  Đã phủ toàn quốc.
                </span>
              )}
            </div>
            <div
              role='meter'
              aria-label='Số tỉnh đã có vùng giao hàng'
              aria-valuemin={0}
              aria-valuemax={stats.total}
              aria-valuenow={stats.covered}
              className='h-2 overflow-hidden rounded-full bg-muted'
            >
              <div
                className='h-full rounded-full bg-chart-1'
                style={{ width: `${(stats.covered / stats.total) * 100}%` }}
              />
            </div>
            {stats.uncovered.length > 0 && (
              <div className='flex items-start gap-2 text-sm'>
                <HugeiconsIcon
                  icon={Alert02Icon}
                  size={16}
                  strokeWidth={1.75}
                  className='mt-0.5 shrink-0 text-muted-foreground'
                />
                <p className='text-muted-foreground'>
                  Khách ở{' '}
                  {stats.uncovered.length === stats.total
                    ? 'mọi tỉnh'
                    : `${stats.uncovered.length} tỉnh`}{' '}
                  chưa đặt hàng được:{' '}
                  <span className='text-foreground'>
                    {stats.uncovered.join(', ')}
                  </span>
                  .
                </p>
              </div>
            )}
          </section>

          {zones.length === 0 ? (
            <DataTableState
              icon={DeliveryTruck01Icon}
              title='Chưa có vùng giao hàng'
              description='Tạo ít nhất 1 vùng (vd "Nội thành Hồ Chí Minh") thì khách mới đặt hàng được.'
              action={addButton}
            />
          ) : (
            <div className='overflow-hidden rounded-sm border'>
              <Table>
                <TableHeader className='bg-muted/50'>
                  <TableRow className='hover:bg-transparent'>
                    {[
                      ['Vùng', 'pl-4'],
                      ['Biểu phí', 'hidden md:table-cell'],
                      ['Miễn phí ship', 'hidden lg:table-cell'],
                      ['Giao', 'hidden sm:table-cell'],
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
                  {zones.map((zone) => {
                    const extra = zone.provinces.length - VISIBLE_PROVINCES;
                    return (
                      <TableRow
                        key={zone.id}
                        className={cn(
                          !zone.isActive && 'text-muted-foreground',
                        )}
                      >
                        <TableCell className='max-w-0 min-w-64 py-3 pl-4 whitespace-normal'>
                          <button
                            type='button'
                            onClick={() =>
                              setFormTarget({ mode: 'edit', zone })
                            }
                            className={cn(
                              'rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring',
                              zone.isActive && 'text-foreground',
                            )}
                          >
                            {zone.name}
                          </button>
                          <div className='mt-1 flex flex-wrap gap-1'>
                            {zone.provinces
                              .slice(0, VISIBLE_PROVINCES)
                              .map((province) => (
                                <Badge
                                  key={province}
                                  variant='outline'
                                  className='rounded-sm font-normal'
                                >
                                  {province}
                                </Badge>
                              ))}
                            {extra > 0 && (
                              <Badge
                                variant='outline'
                                className='rounded-sm font-normal text-muted-foreground'
                                title={zone.provinces
                                  .slice(VISIBLE_PROVINCES)
                                  .join(', ')}
                              >
                                +{extra} tỉnh
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='hidden max-w-64 whitespace-normal md:table-cell'>
                          <div>{describeFee(zone)}</div>
                          {zone.bulkySurcharge > 0 && (
                            <div className='text-xs text-muted-foreground'>
                              Cồng kềnh +{formatVND(zone.bulkySurcharge)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className='hidden tabular-nums lg:table-cell'>
                          {zone.freeShipThreshold ? (
                            `Từ ${formatVND(zone.freeShipThreshold)}`
                          ) : (
                            <span className='text-muted-foreground'>Không</span>
                          )}
                        </TableCell>
                        <TableCell className='hidden tabular-nums sm:table-cell'>
                          {zone.estimatedDays} ngày
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={zone.isActive ? 'secondary' : 'outline'}
                            className='rounded-sm'
                          >
                            {zone.isActive ? 'Đang hoạt động' : 'Đang tắt'}
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
                                  aria-label={`Thao tác với vùng "${zone.name}"`}
                                  disabled={
                                    update.isPending &&
                                    update.variables?.id === zone.id
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
                              className='w-48 rounded-sm'
                            >
                              <DropdownMenuItem
                                className='rounded-sm'
                                onClick={() =>
                                  setFormTarget({ mode: 'edit', zone })
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
                                onClick={() => toggleActive(zone)}
                              >
                                <HugeiconsIcon
                                  icon={
                                    zone.isActive ? ViewOffSlashIcon : ViewIcon
                                  }
                                  strokeWidth={1.75}
                                />
                                {zone.isActive ? 'Tắt vùng' : 'Bật vùng'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant='destructive'
                                className='rounded-sm'
                                onClick={() => setDeleting(zone)}
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
          )}
        </div>
      )}

      <ZoneFormDialog
        target={formTarget}
        zones={zones ?? []}
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
              toast.success(`Đã xóa vùng "${deleting.name}"`);
              setDeleting(null);
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </>
  );
}
