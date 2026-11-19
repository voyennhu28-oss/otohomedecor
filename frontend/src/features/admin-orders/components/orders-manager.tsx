'use client';

import {
  FileExportIcon,
  FilterRemoveIcon,
  ShoppingBag01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMemo } from 'react';
import { toast } from 'sonner';

import { DataTablePagination } from '@/components/admin/data-table-pagination';
import {
  DataTableSkeleton,
  DataTableState,
} from '@/components/admin/data-table-state';
import { SearchInput } from '@/components/admin/search-input';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from '@/constants/orders';
import {
  hasOrderFilters,
  ORDER_FILTER_DEFAULTS,
  SEARCH_FIELDS,
  toOrderFilter,
  toOrderQuery,
} from '@/features/admin-orders/filters';
import {
  useAdminOrders,
  useExportOrders,
} from '@/features/admin-orders/hooks/use-admin-orders';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { saveFile } from '@/lib/api-client';
import { cn } from '@/lib/utils';

import { OrderTable } from './order-table';

const exportFileName = () =>
  `orders_${new Date().toISOString().slice(0, 10).replaceAll('-', '_')}.xlsx`;

function selectClass(active: boolean) {
  return cn(
    '[&_select]:rounded-sm',
    active && '[&_select]:border-foreground/40 [&_select]:bg-background',
  );
}

export function OrdersManager() {
  const { values, setValues, reset } = useUrlFilters(ORDER_FILTER_DEFAULTS);
  const filter = useMemo(() => toOrderFilter(values), [values]);
  const query = useMemo(() => toOrderQuery(values), [values]);
  const filtering = hasOrderFilters(filter);
  const searchText = filter.orderNumber ?? filter.email ?? '';

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useAdminOrders(query);
  const exportOrders = useExportOrders();

  const runExport = () =>
    exportOrders.mutate(filter, {
      onSuccess: (file) => {
        saveFile(file, file.filename ?? exportFileName());
        toast.success(
          filtering
            ? 'Đã xuất các đơn theo bộ lọc đang chọn'
            : 'Đã xuất tất cả đơn',
        );
      },
      onError: (err) => toast.error(err.message),
    });

  const otherFilters =
    filter.paymentMethod !== undefined ||
    filter.paymentStatus !== undefined ||
    filter.from !== undefined ||
    filter.to !== undefined ||
    searchText !== '';

  return (
    <>
      <AdminPageHeader
        title='Đơn hàng'
        description='Xác nhận, giao hàng và theo dõi trạng thái đơn.'
        actions={
          <Button
            variant='outline'
            size='sm'
            className='rounded-sm'
            disabled={exportOrders.isPending || data?.totalItems === 0}
            onClick={runExport}
          >
            <HugeiconsIcon icon={FileExportIcon} strokeWidth={1.75} />
            {exportOrders.isPending
              ? 'Đang xuất…'
              : filtering
                ? 'Xuất Excel theo bộ lọc'
                : 'Xuất Excel'}
          </Button>
        }
      />

      <div className='flex flex-col gap-4'>
        <div className='-mx-4 no-scrollbar overflow-x-auto px-4 md:mx-0 md:px-0'>
          <Tabs
            value={filter.status ?? 'all'}
            onValueChange={(value) =>
              setValues({ status: value === 'all' ? '' : String(value) })
            }
          >
            <TabsList
              variant='line'
              className='w-max min-w-full justify-start border-b'
            >
              <TabsTrigger value='all' className='flex-none px-3'>
                Tất cả
              </TabsTrigger>
              {Object.entries(ORDER_STATUSES).map(([key, label]) => (
                <TabsTrigger key={key} value={key} className='flex-none px-3'>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex w-full sm:w-auto'>
            <NativeSelect
              size='sm'
              value={values.by in SEARCH_FIELDS ? values.by : 'orderNumber'}
              onChange={(event) => setValues({ by: event.target.value })}
              aria-label='Tìm theo'
              className='[&_select]:rounded-l-sm [&_select]:rounded-r-none [&_select]:border-r-0'
            >
              {Object.entries(SEARCH_FIELDS).map(([key, label]) => (
                <NativeSelectOption key={key} value={key}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <SearchInput
              value={searchText}
              onChange={(q) => setValues({ q })}
              placeholder={
                values.by === 'email' ? 'vd: an.nguyen@' : 'vd: HD261117'
              }
              label='Tìm đơn hàng'
              className='min-w-0 flex-1 sm:w-56 [&_input]:rounded-l-none'
            />
          </div>
          <NativeSelect
            size='sm'
            value={filter.paymentMethod ?? ''}
            onChange={(event) => setValues({ method: event.target.value })}
            aria-label='Lọc theo phương thức thanh toán'
            className={selectClass(!!filter.paymentMethod)}
          >
            <NativeSelectOption value=''>Mọi phương thức</NativeSelectOption>
            {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
              <NativeSelectOption key={key} value={key}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            size='sm'
            value={filter.paymentStatus ?? ''}
            onChange={(event) => setValues({ payment: event.target.value })}
            aria-label='Lọc theo trạng thái thanh toán'
            className={selectClass(!!filter.paymentStatus)}
          >
            <NativeSelectOption value=''>
              Mọi trạng thái thanh toán
            </NativeSelectOption>
            {Object.entries(PAYMENT_STATUSES).map(([key, label]) => (
              <NativeSelectOption key={key} value={key}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <div className='flex items-center gap-1.5 text-sm text-muted-foreground'>
            <label htmlFor='orders-from' className='sr-only'>
              Từ ngày
            </label>
            <Input
              id='orders-from'
              type='date'
              value={filter.from ?? ''}
              max={filter.to}
              onChange={(event) => setValues({ from: event.target.value })}
              className={cn(
                'h-8 w-36 rounded-sm text-sm',
                filter.from && 'border-foreground/40 bg-background',
              )}
            />
            <span aria-hidden>–</span>
            <label htmlFor='orders-to' className='sr-only'>
              Đến ngày
            </label>
            <Input
              id='orders-to'
              type='date'
              value={filter.to ?? ''}
              min={filter.from}
              onChange={(event) => setValues({ to: event.target.value })}
              className={cn(
                'h-8 w-36 rounded-sm text-sm',
                filter.to && 'border-foreground/40 bg-background',
              )}
            />
          </div>
          {filtering && (
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
          <DataTableSkeleton label='Đang tải đơn hàng' />
        ) : isError ? (
          <DataTableState
            title='Không tải được đơn hàng'
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
          data.totalItems > 0 ? (
            <DataTableState
              title='Trang này không có đơn'
              action={
                <Button
                  variant='outline'
                  size='sm'
                  className='rounded-sm'
                  onClick={() => setValues({ page: '1' })}
                >
                  Về trang đầu
                </Button>
              }
            />
          ) : filtering ? (
            <DataTableState
              title={
                filter.status && !otherFilters
                  ? `Không có đơn "${ORDER_STATUSES[filter.status]}"`
                  : 'Không có đơn phù hợp'
              }
              description={
                otherFilters ? 'Thử đổi hoặc bỏ bớt bộ lọc.' : undefined
              }
              action={
                otherFilters && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='rounded-sm'
                    onClick={reset}
                  >
                    Xóa bộ lọc
                  </Button>
                )
              }
            />
          ) : (
            <DataTableState
              icon={ShoppingBag01Icon}
              title='Chưa có đơn hàng nào'
              description='Đơn khách đặt ở cửa hàng sẽ hiện ở đây.'
            />
          )
        ) : (
          <>
            <OrderTable
              orders={data.list}
              fetching={isFetching && isPlaceholderData}
            />
            <DataTablePagination
              page={query.page ?? 1}
              pageSize={query.itemPerPage ?? 20}
              totalItems={data.totalItems}
              totalPages={data.totalPages}
              itemLabel='đơn'
              onPageChange={(page) => setValues({ page: String(page) })}
              onPageSizeChange={(size) => setValues({ size: String(size) })}
            />
          </>
        )}
      </div>
    </>
  );
}
