'use client';

import {
  Add01Icon,
  Cancel01Icon,
  FileExportIcon,
  FileImportIcon,
  FilterRemoveIcon,
  PackageIcon,
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
import { PRODUCT_STATUSES, type ProductStatus } from '@/constants/catalog';
import { useAdminCategories } from '@/features/admin-categories/hooks/use-admin-categories';
import { flattenTree } from '@/features/admin-categories/tree';
import { useAdminCollections } from '@/features/admin-collections/hooks/use-admin-collections';
import {
  hasProductFilters,
  PRODUCT_FILTER_DEFAULTS,
  toProductQuery,
} from '@/features/admin-products/filters';
import {
  useAdminProducts,
  useDeleteProduct,
  useExportProducts,
  useUpdateProduct,
} from '@/features/admin-products/hooks/use-admin-products';
import type { AdminProductListItem } from '@/features/products/types';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { saveFile } from '@/lib/api-client';
import { cn } from '@/lib/utils';

import { ImportProductsDialog } from './import-products-dialog';
import { ProductCreateDialog } from './product-create-dialog';
import { ProductTable } from './product-table';

const exportFileName = () =>
  `products_${new Date().toISOString().slice(0, 10).replaceAll('-', '_')}.xlsx`;

function selectClass(active: boolean) {
  return cn(
    '[&_select]:rounded-sm',
    active && '[&_select]:border-foreground/40 [&_select]:bg-background',
  );
}

export function ProductsManager() {
  const { values, setValues, reset } = useUrlFilters(PRODUCT_FILTER_DEFAULTS);
  const query = useMemo(() => toProductQuery(values), [values]);
  const filtering = hasProductFilters(query);

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useAdminProducts(query);
  const { data: tree } = useAdminCategories();
  const categoryOptions = useMemo(() => flattenTree(tree ?? []), [tree]);
  const { data: collections } = useAdminCollections();

  const update = useUpdateProduct();
  const remove = useDeleteProduct();
  const exportProducts = useExportProducts();

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [importing, setImporting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminProductListItem | null>(null);

  const addButton = (
    <Button size='sm' className='rounded-sm' onClick={() => setCreating(true)}>
      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
      Thêm sản phẩm
    </Button>
  );

  const runExport = (ids?: string[]) =>
    exportProducts.mutate(ids, {
      onSuccess: (file) => {
        saveFile(file, file.filename ?? exportFileName());
        toast.success(
          ids?.length
            ? `Đã xuất ${ids.length} sản phẩm`
            : 'Đã xuất tất cả sản phẩm',
        );
      },
      onError: (err) => toast.error(err.message),
    });

  const changeProduct = (
    product: AdminProductListItem,
    body: { isFeatured?: boolean; status?: ProductStatus },
    message: string,
  ) =>
    update.mutate(
      { id: product.id, body },
      {
        onSuccess: () => toast.success(message),
        onError: (err) => toast.error(err.message),
      },
    );

  const confirmContent: ConfirmContent | null = deleting && {
    title: 'Xóa sản phẩm?',
    description: `"${deleting.name}" và ${deleting._count.variants} biến thể sẽ bị xóa khỏi cửa hàng. Đơn hàng cũ không bị ảnh hưởng.`,
    confirmLabel: 'Xóa sản phẩm',
    destructive: true,
  };

  const totalItems = data?.totalItems ?? 0;

  return (
    <>
      <AdminPageHeader
        title='Sản phẩm'
        description={
          data && !filtering
            ? `${totalItems} sản phẩm trong cửa hàng.`
            : 'Sản phẩm, biến thể, tồn kho và ảnh.'
        }
        actions={
          <>
            <Button
              variant='outline'
              size='sm'
              className='rounded-sm'
              onClick={() => setImporting(true)}
            >
              <HugeiconsIcon icon={FileImportIcon} strokeWidth={1.75} />
              Nhập Excel
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='rounded-sm'
              disabled={exportProducts.isPending || totalItems === 0}
              onClick={() => runExport()}
            >
              <HugeiconsIcon icon={FileExportIcon} strokeWidth={1.75} />
              {exportProducts.isPending ? 'Đang xuất…' : 'Xuất tất cả'}
            </Button>
            {addButton}
          </>
        }
      />

      <div className='flex flex-col gap-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <SearchInput
            value={values.q}
            onChange={(q) => setValues({ q })}
            placeholder='Tìm theo tên hoặc SKU'
            label='Tìm sản phẩm'
            className='w-full sm:w-72'
          />
          <NativeSelect
            size='sm'
            value={query.status ?? ''}
            onChange={(event) => setValues({ status: event.target.value })}
            aria-label='Lọc theo trạng thái'
            className={selectClass(!!query.status)}
          >
            <NativeSelectOption value=''>Mọi trạng thái</NativeSelectOption>
            {Object.entries(PRODUCT_STATUSES).map(([key, label]) => (
              <NativeSelectOption key={key} value={key}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            size='sm'
            value={query.categoryID ?? ''}
            onChange={(event) => setValues({ category: event.target.value })}
            aria-label='Lọc theo danh mục'
            className={selectClass(!!query.categoryID)}
          >
            <NativeSelectOption value=''>Mọi danh mục</NativeSelectOption>
            {categoryOptions.map(({ node, depth }) => (
              <NativeSelectOption key={node.id} value={node.id}>
                {`${'   '.repeat(depth)}${node.name}`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {(collections?.length ?? 0) > 0 && (
            <NativeSelect
              size='sm'
              value={query.collectionID ?? ''}
              onChange={(event) =>
                setValues({ collection: event.target.value })
              }
              aria-label='Lọc theo bộ sưu tập'
              className={selectClass(!!query.collectionID)}
            >
              <NativeSelectOption value=''>Mọi bộ sưu tập</NativeSelectOption>
              {collections?.map((collection) => (
                <NativeSelectOption key={collection.id} value={collection.id}>
                  {collection.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
          <NativeSelect
            size='sm'
            value={values.featured}
            onChange={(event) => setValues({ featured: event.target.value })}
            aria-label='Lọc sản phẩm nổi bật'
            className={selectClass(query.isFeatured !== undefined)}
          >
            <NativeSelectOption value=''>Nổi bật & thường</NativeSelectOption>
            <NativeSelectOption value='true'>Chỉ nổi bật</NativeSelectOption>
            <NativeSelectOption value='false'>Không nổi bật</NativeSelectOption>
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

        {selected.size > 0 && (
          <div className='flex flex-wrap items-center gap-2 rounded-sm border bg-muted/40 px-3 py-2 text-sm'>
            <span className='font-medium'>
              Đã chọn {selected.size} sản phẩm
            </span>
            <Button
              variant='outline'
              size='xs'
              className='rounded-sm bg-background'
              disabled={exportProducts.isPending}
              onClick={() => runExport([...selected])}
            >
              <HugeiconsIcon icon={FileExportIcon} strokeWidth={1.75} />
              Xuất Excel
            </Button>
            <Button
              variant='ghost'
              size='xs'
              className='rounded-sm text-muted-foreground'
              onClick={() => setSelected(new Set())}
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              Bỏ chọn
            </Button>
          </div>
        )}

        {isPending ? (
          <DataTableSkeleton label='Đang tải sản phẩm' />
        ) : isError ? (
          <DataTableState
            title='Không tải được sản phẩm'
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
          filtering ? (
            <DataTableState
              title='Không có sản phẩm phù hợp'
              description={
                query.q
                  ? `Không có sản phẩm nào khớp "${query.q}" với bộ lọc đang chọn.`
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
          ) : data.totalItems > 0 ? (
            <DataTableState
              title='Trang này không có sản phẩm'
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
          ) : (
            <DataTableState
              icon={PackageIcon}
              title='Chưa có sản phẩm nào'
              description='Thêm sản phẩm đầu tiên, hoặc nhập nhiều sản phẩm cùng lúc từ file Excel.'
              action={addButton}
            />
          )
        ) : (
          <>
            <ProductTable
              products={data.list}
              selected={selected}
              onSelectedChange={setSelected}
              fetching={isFetching && isPlaceholderData}
              busyID={update.isPending ? (update.variables?.id ?? null) : null}
              onToggleFeatured={(product) =>
                changeProduct(
                  product,
                  { isFeatured: !product.isFeatured },
                  product.isFeatured
                    ? `Đã bỏ nổi bật "${product.name}"`
                    : `Đã đánh dấu nổi bật "${product.name}"`,
                )
              }
              onChangeStatus={(product, status) =>
                changeProduct(
                  product,
                  { status },
                  `"${product.name}" chuyển sang "${PRODUCT_STATUSES[status]}"`,
                )
              }
              onDelete={setDeleting}
            />
            <DataTablePagination
              page={query.page ?? 1}
              pageSize={query.itemPerPage ?? 20}
              totalItems={data.totalItems}
              totalPages={data.totalPages}
              itemLabel='sản phẩm'
              onPageChange={(page) => setValues({ page: String(page) })}
              onPageSizeChange={(size) => setValues({ size: String(size) })}
            />
          </>
        )}
      </div>

      <ProductCreateDialog
        open={creating}
        onClose={() => setCreating(false)}
        categoryID={query.categoryID}
      />
      <ImportProductsDialog
        open={importing}
        onClose={() => setImporting(false)}
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
              setSelected((prev) => {
                const next = new Set(prev);
                next.delete(deleting.id);
                return next;
              });
              setDeleting(null);
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </>
  );
}
