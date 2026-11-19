'use client';

import {
  Add01Icon,
  Album02Icon,
  FilterRemoveIcon,
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
import { Button } from '@/components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { paginate } from '@/features/admin-categories/filters';
import {
  COLLECTION_FILTER_DEFAULTS,
  COLLECTION_SORTS,
  COLLECTION_STATES,
  filterCollections,
  getCollectionState,
  hasCollectionFilters,
  parseCollectionFilters,
} from '@/features/admin-collections/filters';
import {
  useAdminCollections,
  useDeleteCollection,
  useUpdateCollection,
} from '@/features/admin-collections/hooks/use-admin-collections';
import type {
  Collection,
  UpdateCollectionInput,
} from '@/features/collections/types';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { cn } from '@/lib/utils';

import {
  CollectionFormDialog,
  type CollectionFormTarget,
} from './collection-form-dialog';
import { CollectionProductsDialog } from './collection-products-dialog';
import { CollectionTable } from './collection-table';

function selectClass(active: boolean) {
  return cn(
    '[&_select]:rounded-sm',
    active && '[&_select]:border-foreground/40 [&_select]:bg-background',
  );
}

export function CollectionsManager() {
  const { data, isPending, isError, error, refetch } = useAdminCollections();
  const update = useUpdateCollection();
  const remove = useDeleteCollection();

  const { values, setValues, reset } = useUrlFilters(
    COLLECTION_FILTER_DEFAULTS,
  );
  const filters = parseCollectionFilters(values);
  const filtering = hasCollectionFilters(filters);

  const [formTarget, setFormTarget] = useState<CollectionFormTarget | null>(
    null,
  );
  const [managing, setManaging] = useState<Collection | null>(null);
  const [deleting, setDeleting] = useState<Collection | null>(null);

  const rows = useMemo(
    () => (data ? filterCollections([...data], filters) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, values],
  );
  const pageData = paginate(rows, filters.page, filters.size);
  const liveCount = useMemo(
    () =>
      (data ?? []).filter(
        (collection) => getCollectionState(collection) === 'live',
      ).length,
    [data],
  );

  const change = (
    collection: Collection,
    body: UpdateCollectionInput,
    message: string,
  ) =>
    update.mutate(
      { id: collection.id, body },
      {
        onSuccess: () => toast.success(message),
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
      Thêm bộ sưu tập
    </Button>
  );

  const confirmContent: ConfirmContent | null = deleting && {
    title: 'Xóa bộ sưu tập?',
    description: `"${deleting.name}" sẽ bị xóa khỏi cửa hàng. Sản phẩm trong bộ sưu tập không bị xóa. Slug dùng lại được sau khi xóa.`,
    confirmLabel: 'Xóa bộ sưu tập',
    destructive: true,
  };

  return (
    <>
      <AdminPageHeader
        title='Bộ sưu tập'
        description={
          data && data.length > 0
            ? `${data.length} bộ sưu tập · ${liveCount} đang hiển thị ở cửa hàng.`
            : 'Nhóm sản phẩm theo chủ đề, mùa hoặc dịp đặc biệt.'
        }
        actions={addButton}
      />

      {isPending ? (
        <DataTableSkeleton label='Đang tải bộ sưu tập' />
      ) : isError ? (
        <DataTableState
          title='Không tải được bộ sưu tập'
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
      ) : data.length === 0 ? (
        <DataTableState
          icon={Album02Icon}
          title='Chưa có bộ sưu tập nào'
          description='Tạo bộ sưu tập như "Biển mùa hè", "Quà Tết", rồi gán sản phẩm vào.'
          action={addButton}
        />
      ) : (
        <div className='flex flex-col gap-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <SearchInput
              value={filters.q}
              onChange={(q) => setValues({ q })}
              placeholder='Tìm theo tên hoặc slug'
              label='Tìm bộ sưu tập'
              className='w-full sm:w-64'
            />
            <NativeSelect
              size='sm'
              value={filters.status}
              onChange={(event) => setValues({ status: event.target.value })}
              aria-label='Lọc theo trạng thái'
              className={selectClass(filters.status !== '')}
            >
              <NativeSelectOption value=''>Mọi trạng thái</NativeSelectOption>
              {Object.entries(COLLECTION_STATES).map(([key, label]) => (
                <NativeSelectOption key={key} value={key}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              size='sm'
              value={filters.featured}
              onChange={(event) => setValues({ featured: event.target.value })}
              aria-label='Lọc bộ sưu tập nổi bật'
              className={selectClass(filters.featured !== '')}
            >
              <NativeSelectOption value=''>Nổi bật & thường</NativeSelectOption>
              <NativeSelectOption value='true'>Chỉ nổi bật</NativeSelectOption>
              <NativeSelectOption value='false'>
                Không nổi bật
              </NativeSelectOption>
            </NativeSelect>
            <NativeSelect
              size='sm'
              value={filters.sort}
              onChange={(event) => setValues({ sort: event.target.value })}
              aria-label='Sắp xếp'
              className={selectClass(filters.sort !== 'order')}
            >
              {Object.entries(COLLECTION_SORTS).map(([key, label]) => (
                <NativeSelectOption key={key} value={key}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
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

          {pageData.totalItems === 0 ? (
            <DataTableState
              title='Không có bộ sưu tập phù hợp'
              description={
                filters.q
                  ? `Không có bộ sưu tập nào khớp "${filters.q}" với bộ lọc đang chọn.`
                  : 'Thử đổi hoặc bỏ bớt bộ lọc.'
              }
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
            <>
              <CollectionTable
                collections={pageData.items}
                busyID={
                  update.isPending ? (update.variables?.id ?? null) : null
                }
                onEdit={(collection) =>
                  setFormTarget({ mode: 'edit', collection })
                }
                onManageProducts={setManaging}
                onToggleActive={(collection) =>
                  change(
                    collection,
                    { isActive: !collection.isActive },
                    collection.isActive
                      ? `Đã tắt "${collection.name}"`
                      : `Đã bật "${collection.name}"`,
                  )
                }
                onToggleFeatured={(collection) =>
                  change(
                    collection,
                    { isFeatured: !collection.isFeatured },
                    collection.isFeatured
                      ? `Đã bỏ nổi bật "${collection.name}"`
                      : `Đã đánh dấu nổi bật "${collection.name}"`,
                  )
                }
                onDelete={setDeleting}
              />
              <DataTablePagination
                page={pageData.page}
                pageSize={filters.size}
                totalItems={pageData.totalItems}
                totalPages={pageData.totalPages}
                itemLabel='bộ sưu tập'
                onPageChange={(page) => setValues({ page: String(page) })}
                onPageSizeChange={(size) => setValues({ size: String(size) })}
              />
            </>
          )}
        </div>
      )}

      <CollectionFormDialog
        target={formTarget}
        collections={data ?? []}
        onClose={() => setFormTarget(null)}
      />
      <CollectionProductsDialog
        collection={managing}
        onClose={() => setManaging(null)}
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
              toast.success(`Đã xóa "${deleting.name}"`);
              setDeleting(null);
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </>
  );
}
