'use client';

import { Cancel01Icon, Image01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { DataTablePagination } from '@/components/admin/data-table-pagination';
import { DataTableState } from '@/components/admin/data-table-state';
import { SearchInput } from '@/components/admin/search-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAddCollectionProducts,
  useRemoveCollectionProduct,
} from '@/features/admin-collections/hooks/use-admin-collections';
import { ProductStatusBadge } from '@/features/admin-products/components/product-status-badge';
import { useAdminProducts } from '@/features/admin-products/hooks/use-admin-products';
import type { Collection } from '@/features/collections/types';
import type { AdminProductListItem } from '@/features/products/types';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE_SIZES = [10, 20, 50] as const;
const MAX_ADD = 200;

type Tab = 'current' | 'add';

export function CollectionProductsDialog({
  collection: collectionProp,
  onClose,
}: {
  collection: Collection | null;
  onClose: () => void;
}) {
  const collection = useRetainedValue(collectionProp);
  const [openCount, setOpenCount] = useState(0);
  const [lastCollection, setLastCollection] = useState(collectionProp);
  if (collectionProp !== null && collectionProp !== lastCollection) {
    setLastCollection(collectionProp);
    setOpenCount((count) => count + 1);
  }

  return (
    <Dialog
      open={collectionProp !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className='flex h-[min(760px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden rounded-sm p-0 sm:max-w-3xl'>
        {collection && (
          <ProductsPanel
            key={openCount}
            collection={collection}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProductsPanel({
  collection,
  onClose,
}: {
  collection: Collection;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('current');
  const [current, setCurrent] = useState({ q: '', page: 1, size: 10 });
  const [search, setSearch] = useState({ q: '', page: 1, size: 10 });
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const inCollection = useAdminProducts({
    collectionID: collection.id,
    q: current.q || undefined,
    page: current.page,
    itemPerPage: current.size,
  });
  const candidates = useAdminProducts({
    q: search.q || undefined,
    page: search.page,
    itemPerPage: search.size,
  });
  const add = useAddCollectionProducts(collection.id);
  const remove = useRemoveCollectionProduct(collection.id);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_ADD) next.add(id);
      return next;
    });

  const addSelected = () =>
    add.mutate([...selected], {
      onSuccess: ({ added }) => {
        toast.success(
          added > 0
            ? `Đã thêm ${added} sản phẩm vào "${collection.name}"`
            : 'Các sản phẩm đã có sẵn trong bộ sưu tập',
        );
        setSelected(new Set());
        setTab('current');
      },
      onError: (error) => toast.error(error.message),
    });

  const removeOne = (product: AdminProductListItem) =>
    remove.mutate(product.id, {
      onSuccess: () => toast.success(`Đã gỡ "${product.name}"`),
      onError: (error) => toast.error(error.message),
    });

  const total = inCollection.data?.totalItems;

  return (
    <>
      <DialogHeader className='shrink-0 gap-3 border-b px-6 pt-6 pr-14 pb-0'>
        <div>
          <DialogTitle className='text-2xl'>
            Sản phẩm trong bộ sưu tập
          </DialogTitle>
          <DialogDescription>{collection.name}</DialogDescription>
        </div>
        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
          <TabsList variant='line' className='-mb-px h-10 justify-start'>
            <TabsTrigger value='current' className='flex-none px-3'>
              Đang có
              {total !== undefined && (
                <span className='text-xs text-muted-foreground tabular-nums'>
                  {total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value='add' className='flex-none px-3'>
              Thêm sản phẩm
              {selected.size > 0 && (
                <span className='text-xs text-muted-foreground tabular-nums'>
                  {selected.size}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </DialogHeader>

      <div className='no-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5'>
        {tab === 'current' ? (
          <>
            <SearchInput
              value={current.q}
              onChange={(q) => setCurrent((prev) => ({ ...prev, q, page: 1 }))}
              placeholder='Tìm trong bộ sưu tập'
              label='Tìm sản phẩm trong bộ sưu tập'
              className='sm:w-72'
            />
            <ProductList
              query={inCollection}
              emptyTitle={
                current.q
                  ? 'Không có sản phẩm phù hợp'
                  : 'Bộ sưu tập chưa có sản phẩm'
              }
              emptyAction={
                !current.q && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='rounded-sm'
                    onClick={() => setTab('add')}
                  >
                    Thêm sản phẩm
                  </Button>
                )
              }
              renderAction={(product) => (
                <Button
                  variant='ghost'
                  size='xs'
                  className='rounded-sm text-muted-foreground'
                  disabled={remove.isPending && remove.variables === product.id}
                  onClick={() => removeOne(product)}
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                  Gỡ
                </Button>
              )}
            />
            {(inCollection.data?.totalItems ?? 0) > 0 && (
              <DataTablePagination
                page={current.page}
                pageSize={current.size}
                totalItems={inCollection.data?.totalItems ?? 0}
                totalPages={inCollection.data?.totalPages}
                pageSizeOptions={PAGE_SIZES}
                itemLabel='sản phẩm'
                onPageChange={(page) =>
                  setCurrent((prev) => ({ ...prev, page }))
                }
                onPageSizeChange={(size) =>
                  setCurrent((prev) => ({ ...prev, size, page: 1 }))
                }
              />
            )}
          </>
        ) : (
          <>
            <SearchInput
              value={search.q}
              onChange={(q) => setSearch((prev) => ({ ...prev, q, page: 1 }))}
              placeholder='Tìm theo tên hoặc SKU'
              label='Tìm sản phẩm để thêm'
              className='sm:w-72'
            />
            <ProductList
              query={candidates}
              emptyTitle={
                search.q ? 'Không có sản phẩm phù hợp' : 'Chưa có sản phẩm nào'
              }
              renderLead={(product) => {
                const already = product.collectionIDs.includes(collection.id);
                return (
                  <Checkbox
                    aria-label={`Chọn "${product.name}"`}
                    checked={already || selected.has(product.id)}
                    disabled={already}
                    onCheckedChange={() => toggle(product.id)}
                  />
                );
              }}
              renderAction={(product) =>
                product.collectionIDs.includes(collection.id) ? (
                  <Badge variant='outline' className='rounded-sm'>
                    Đã có
                  </Badge>
                ) : null
              }
              onRowClick={(product) => {
                if (!product.collectionIDs.includes(collection.id)) {
                  toggle(product.id);
                }
              }}
            />
            {(candidates.data?.totalItems ?? 0) > 0 && (
              <DataTablePagination
                page={search.page}
                pageSize={search.size}
                totalItems={candidates.data?.totalItems ?? 0}
                totalPages={candidates.data?.totalPages}
                pageSizeOptions={PAGE_SIZES}
                itemLabel='sản phẩm'
                onPageChange={(page) =>
                  setSearch((prev) => ({ ...prev, page }))
                }
                onPageSizeChange={(size) =>
                  setSearch((prev) => ({ ...prev, size, page: 1 }))
                }
              />
            )}
          </>
        )}
      </div>

      <DialogFooter className='shrink-0 items-center border-t bg-muted/30 px-6 py-4'>
        {tab === 'add' && selected.size > 0 && (
          <div className='flex items-center gap-2 text-sm sm:mr-auto'>
            <span>
              Đã chọn <strong>{selected.size}</strong> sản phẩm
              {selected.size >= MAX_ADD && ` (tối đa ${MAX_ADD} mỗi lần)`}
            </span>
            <Button
              variant='ghost'
              size='xs'
              className='rounded-sm text-muted-foreground'
              onClick={() => setSelected(new Set())}
            >
              Bỏ chọn
            </Button>
          </div>
        )}
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-sm'
          onClick={onClose}
        >
          Đóng
        </Button>
        {tab === 'add' && (
          <Button
            type='button'
            size='sm'
            className='rounded-sm'
            disabled={selected.size === 0 || add.isPending}
            onClick={addSelected}
          >
            {add.isPending
              ? 'Đang thêm…'
              : selected.size > 0
                ? `Thêm ${selected.size} sản phẩm`
                : 'Thêm sản phẩm'}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

function ProductList({
  query,
  emptyTitle,
  emptyAction,
  renderLead,
  renderAction,
  onRowClick,
}: {
  query: ReturnType<typeof useAdminProducts>;
  emptyTitle: string;
  emptyAction?: React.ReactNode;
  renderLead?: (product: AdminProductListItem) => React.ReactNode;
  renderAction: (product: AdminProductListItem) => React.ReactNode;
  onRowClick?: (product: AdminProductListItem) => void;
}) {
  if (query.isPending) {
    return (
      <div
        role='status'
        aria-label='Đang tải sản phẩm'
        className='flex flex-col gap-2'
      >
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className='h-14 rounded-sm' />
        ))}
      </div>
    );
  }
  if (query.isError) {
    return (
      <DataTableState
        title='Không tải được sản phẩm'
        description={query.error.message}
        action={
          <Button
            variant='outline'
            size='sm'
            className='rounded-sm'
            onClick={() => query.refetch()}
          >
            Thử lại
          </Button>
        }
      />
    );
  }
  if (query.data.list.length === 0) {
    return <DataTableState title={emptyTitle} action={emptyAction} />;
  }

  return (
    <ul
      className={cn(
        'divide-y rounded-sm border transition-opacity',
        query.isFetching && query.isPlaceholderData && 'opacity-60',
      )}
    >
      {query.data.list.map((product) => (
        <li
          key={product.id}
          onClick={onRowClick ? () => onRowClick(product) : undefined}
          className={cn(
            'flex items-center gap-3 px-3 py-2',
            onRowClick && 'cursor-pointer hover:bg-muted/50',
          )}
        >
          {renderLead && (
            <span onClick={(event) => event.stopPropagation()}>
              {renderLead(product)}
            </span>
          )}
          <span className='flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-muted text-muted-foreground'>
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[0].url}
                alt=''
                loading='lazy'
                className='size-full object-cover'
              />
            ) : (
              <HugeiconsIcon icon={Image01Icon} size={16} strokeWidth={1.5} />
            )}
          </span>
          <span className='grid min-w-0 flex-1'>
            <Link
              href={`/admin/products/${product.id}`}
              target='_blank'
              onClick={(event) => event.stopPropagation()}
              className='truncate text-sm font-medium hover:underline'
            >
              {product.name}
            </Link>
            <span className='truncate text-xs text-muted-foreground'>
              {product.category.name}
              {product.minPrice > 0 && ` · ${formatVND(product.minPrice)}`}
            </span>
          </span>
          <ProductStatusBadge
            status={product.status}
            className='hidden sm:inline-flex'
          />
          <span onClick={(event) => event.stopPropagation()}>
            {renderAction(product)}
          </span>
        </li>
      ))}
    </ul>
  );
}
