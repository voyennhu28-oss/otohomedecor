'use client';

import {
  Add01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Image01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

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
import type { FlatCategory } from '@/features/admin-categories/tree';
import type { AdminCategoryNode } from '@/features/categories/types';
import { cn } from '@/lib/utils';

export type CategoryRowActions = {
  onEdit: (node: AdminCategoryNode) => void;
  onAddChild: (node: AdminCategoryNode) => void;
  onToggleActive: (node: AdminCategoryNode) => void;
  onDelete: (node: AdminCategoryNode) => void;
};

type CategoryTableProps = CategoryRowActions & {
  rows: FlatCategory[];
  treeMode: boolean;
  collapsed: ReadonlySet<string>;
  onToggleCollapse: (id: string) => void;
  togglingID: string | null;
};

export function CategoryTable({
  rows,
  treeMode,
  collapsed,
  onToggleCollapse,
  togglingID,
  ...actions
}: CategoryTableProps) {
  const idsOnPage = new Set(rows.map(({ node }) => node.id));
  return (
    <div className='overflow-hidden rounded-sm border'>
      <Table>
        <TableHeader className='bg-muted/50'>
          <TableRow className='hover:bg-transparent'>
            <TableHead className='h-10 pl-4 text-xs font-medium text-muted-foreground'>
              Danh mục
            </TableHead>
            <TableHead className='h-10 w-28 text-right text-xs font-medium text-muted-foreground'>
              Sản phẩm
            </TableHead>
            <TableHead className='hidden h-10 w-24 text-right text-xs font-medium text-muted-foreground sm:table-cell'>
              Thứ tự
            </TableHead>
            <TableHead className='h-10 w-44 text-xs font-medium text-muted-foreground'>
              Trạng thái
            </TableHead>
            <TableHead className='h-10 w-14'>
              <span className='sr-only'>Thao tác</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <CategoryRow
              key={row.node.id}
              row={row}
              treeMode={treeMode}
              showPath={
                row.depth > 0 &&
                (!treeMode || !idsOnPage.has(row.node.parentID ?? ''))
              }
              expanded={!collapsed.has(row.node.id)}
              onToggleCollapse={onToggleCollapse}
              toggling={togglingID === row.node.id}
              {...actions}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CategoryRow({
  row: { node, depth, ancestors, hiddenByAncestor },
  treeMode,
  showPath,
  expanded,
  onToggleCollapse,
  toggling,
  onEdit,
  onAddChild,
  onToggleActive,
  onDelete,
}: CategoryRowActions & {
  row: FlatCategory;
  treeMode: boolean;
  showPath: boolean;
  expanded: boolean;
  onToggleCollapse: (id: string) => void;
  toggling: boolean;
}) {
  const hasChildren = node.children.length > 0;

  return (
    <TableRow className={cn(!node.isActive && 'text-muted-foreground')}>
      <TableCell className='py-2 pl-4'>
        <div
          className='flex items-center gap-2'
          style={{ paddingLeft: treeMode ? depth * 24 : 0 }}
        >
          {!treeMode ? null : hasChildren ? (
            <Button
              variant='ghost'
              size='icon-xs'
              className='rounded-sm text-muted-foreground'
              aria-expanded={expanded}
              aria-label={`${expanded ? 'Thu gọn' : 'Mở'} "${node.name}"`}
              onClick={() => onToggleCollapse(node.id)}
            >
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                className={cn('transition-transform', expanded && 'rotate-90')}
              />
            </Button>
          ) : (
            <span aria-hidden className='size-6 shrink-0' />
          )}

          <span className='flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-muted text-muted-foreground'>
            {node.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={node.imageUrl}
                alt=''
                loading='lazy'
                className='size-full object-cover'
              />
            ) : (
              <HugeiconsIcon icon={Image01Icon} size={16} strokeWidth={1.5} />
            )}
          </span>

          <button
            type='button'
            onClick={() => onEdit(node)}
            className='grid min-w-0 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            {showPath && (
              <span className='truncate text-xs text-muted-foreground'>
                {ancestors.map((ancestor) => ancestor.name).join(' › ')} ›
              </span>
            )}
            <span
              className={cn(
                'truncate font-medium hover:underline',
                node.isActive && 'text-foreground',
              )}
            >
              {node.name}
            </span>
            <span className='truncate font-mono text-xs text-muted-foreground'>
              {node.slug}
            </span>
          </button>
        </div>
      </TableCell>

      <TableCell className='text-right tabular-nums'>
        {node.productCount}
      </TableCell>
      <TableCell className='hidden text-right text-muted-foreground tabular-nums sm:table-cell'>
        {node.sortOrder}
      </TableCell>

      <TableCell>
        {!node.isActive ? (
          <Badge variant='outline' className='rounded-sm'>
            Đang ẩn
          </Badge>
        ) : hiddenByAncestor ? (
          <Badge
            variant='outline'
            className='rounded-sm text-muted-foreground'
            title={`Danh mục cha "${hiddenByAncestor.name}" đang ẩn`}
          >
            Ẩn theo danh mục cha
          </Badge>
        ) : (
          <Badge variant='secondary' className='rounded-sm'>
            Hiển thị
          </Badge>
        )}
      </TableCell>

      <TableCell className='pr-3 text-right'>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant='ghost'
                size='icon-sm'
                className='rounded-sm text-muted-foreground'
                aria-label={`Thao tác với "${node.name}"`}
                disabled={toggling}
              />
            }
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-52 rounded-sm'>
            <DropdownMenuItem
              className='rounded-sm'
              onClick={() => onEdit(node)}
            >
              <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={1.75} />
              Sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              className='rounded-sm'
              onClick={() => onAddChild(node)}
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={1.75} />
              Thêm danh mục con
            </DropdownMenuItem>
            <DropdownMenuItem
              className='rounded-sm'
              onClick={() => onToggleActive(node)}
            >
              <HugeiconsIcon
                icon={node.isActive ? ViewOffSlashIcon : ViewIcon}
                strokeWidth={1.75}
              />
              {node.isActive ? 'Ẩn khỏi cửa hàng' : 'Hiện ở cửa hàng'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant='destructive'
              className='rounded-sm'
              onClick={() => onDelete(node)}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.75} />
              Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
