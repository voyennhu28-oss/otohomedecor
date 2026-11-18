'use client';

import { Add01Icon, Layers01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTablePagination } from '@/components/admin/data-table-pagination';
import {
  DataTableSkeleton,
  DataTableState,
} from '@/components/admin/data-table-state';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import {
  CATEGORY_FILTER_DEFAULTS,
  filterCategories,
  isFlatMode,
  paginate,
  parseCategoryFilters,
} from '@/features/admin-categories/filters';
import {
  useAdminCategories,
  useUpdateCategory,
} from '@/features/admin-categories/hooks/use-admin-categories';
import {
  collectParentIds,
  countTree,
  flattenTree,
} from '@/features/admin-categories/tree';
import type { AdminCategoryNode } from '@/features/categories/types';
import { useUrlFilters } from '@/hooks/use-url-filters';

import {
  CategoryFormDialog,
  type CategoryFormTarget,
} from './category-form-dialog';
import { CategoryTable } from './category-table';
import { CategoryToolbar } from './category-toolbar';
import { DeleteCategoryDialog } from './delete-category-dialog';

export function CategoriesManager() {
  const {
    data: tree,
    isPending,
    isError,
    error,
    refetch,
  } = useAdminCategories();
  const update = useUpdateCategory();

  const { values, setValues, reset } = useUrlFilters(CATEGORY_FILTER_DEFAULTS);
  const filters = parseCategoryFilters(values);
  const flatMode = isFlatMode(filters);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [formTarget, setFormTarget] = useState<CategoryFormTarget | null>(null);
  const [deleting, setDeleting] = useState<AdminCategoryNode | null>(null);

  const allRows = useMemo(
    () => (tree ? filterCategories(tree, filters, collapsed) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tree, values, collapsed],
  );
  const pageData = paginate(allRows, filters.page, filters.size);
  const counts = useMemo(() => countTree(tree ?? []), [tree]);
  const parentIds = useMemo(() => collectParentIds(tree ?? []), [tree]);
  const parentOptions = useMemo(
    () => flattenTree(tree ?? []).filter(({ node }) => parentIds.has(node.id)),
    [tree, parentIds],
  );

  const allCollapsed =
    parentIds.size > 0 && [...parentIds].every((id) => collapsed.has(id));

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleActive = (node: AdminCategoryNode) =>
    update.mutate(
      { id: node.id, body: { isActive: !node.isActive } },
      {
        onSuccess: () =>
          toast.success(
            node.isActive
              ? `Đã ẩn "${node.name}" khỏi cửa hàng`
              : `"${node.name}" đã hiện ở cửa hàng`,
          ),
        onError: (err) => toast.error(err.message),
      },
    );

  const addButton = (
    <Button
      size='sm'
      className='rounded-sm'
      onClick={() => setFormTarget({ mode: 'create' })}
      disabled={!tree}
    >
      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
      Thêm danh mục
    </Button>
  );

  return (
    <>
      <AdminPageHeader
        title='Danh mục'
        description={
          tree && counts.total > 0
            ? `${counts.total} danh mục${counts.hidden > 0 ? ` · ${counts.hidden} đang ẩn` : ''}. Khách lọc sản phẩm theo cây danh mục này.`
            : 'Cây danh mục sản phẩm hiển thị ở cửa hàng.'
        }
        actions={addButton}
      />

      {isPending ? (
        <DataTableSkeleton label='Đang tải danh mục' />
      ) : isError ? (
        <DataTableState
          title='Không tải được danh mục'
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
      ) : tree.length === 0 ? (
        <DataTableState
          icon={Layers01Icon}
          title='Chưa có danh mục nào'
          description='Tạo danh mục đầu tiên, vd "Đèn treo", "Đèn bàn", rồi gắn sản phẩm vào.'
          action={addButton}
        />
      ) : (
        <div className='flex flex-col gap-4'>
          <CategoryToolbar
            filters={filters}
            onChange={setValues}
            onReset={reset}
            filtering={flatMode}
            parentOptions={parentOptions}
            collapseControl={
              flatMode || parentIds.size === 0
                ? null
                : {
                    allCollapsed,
                    onToggleAll: () =>
                      setCollapsed(
                        allCollapsed ? new Set() : new Set(parentIds),
                      ),
                  }
            }
          />

          {pageData.totalItems === 0 ? (
            <DataTableState
              title='Không có danh mục phù hợp'
              description={
                filters.q
                  ? `Không có danh mục nào khớp "${filters.q}" với bộ lọc đang chọn.`
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
              <CategoryTable
                rows={pageData.items}
                treeMode={!flatMode}
                collapsed={collapsed}
                onToggleCollapse={toggleCollapse}
                togglingID={
                  update.isPending ? (update.variables?.id ?? null) : null
                }
                onEdit={(node) =>
                  setFormTarget({ mode: 'edit', category: node })
                }
                onAddChild={(node) =>
                  setFormTarget({ mode: 'create', parentID: node.id })
                }
                onToggleActive={toggleActive}
                onDelete={setDeleting}
              />
              <DataTablePagination
                page={pageData.page}
                pageSize={filters.size}
                totalItems={pageData.totalItems}
                totalPages={pageData.totalPages}
                itemLabel='danh mục'
                onPageChange={(page) => setValues({ page: String(page) })}
                onPageSizeChange={(size) => setValues({ size: String(size) })}
              />
            </>
          )}
        </div>
      )}

      <CategoryFormDialog
        target={formTarget}
        tree={tree ?? []}
        onClose={() => setFormTarget(null)}
      />
      <DeleteCategoryDialog
        category={deleting}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
