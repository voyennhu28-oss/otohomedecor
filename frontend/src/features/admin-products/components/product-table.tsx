'use client';

import {
  ArrowUpRight01Icon,
  Delete02Icon,
  Image01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  StarIcon,
  StarOffIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { PRODUCT_STATUSES, type ProductStatus } from '@/constants/catalog';
import type { AdminProductListItem } from '@/features/products/types';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

import { ProductStatusBadge } from './product-status-badge';

export type ProductRowActions = {
  onToggleFeatured: (product: AdminProductListItem) => void;
  onChangeStatus: (
    product: AdminProductListItem,
    status: ProductStatus,
  ) => void;
  onDelete: (product: AdminProductListItem) => void;
};

type ProductTableProps = ProductRowActions & {
  products: AdminProductListItem[];
  selected: ReadonlySet<string>;
  onSelectedChange: (next: Set<string>) => void;
  busyID: string | null;
  fetching: boolean;
};

function priceRange({ minPrice, maxPrice }: AdminProductListItem) {
  if (minPrice === 0 && maxPrice === 0) return '—';
  if (minPrice === maxPrice) return formatVND(minPrice);
  return `${formatVND(minPrice)} – ${formatVND(maxPrice)}`;
}

export function ProductTable({
  products,
  selected,
  onSelectedChange,
  busyID,
  fetching,
  ...actions
}: ProductTableProps) {
  const pageIDs = products.map((product) => product.id);
  const selectedOnPage = pageIDs.filter((id) => selected.has(id)).length;
  const allOnPage = selectedOnPage === pageIDs.length && pageIDs.length > 0;

  const togglePage = () => {
    const next = new Set(selected);
    for (const id of pageIDs) {
      if (allOnPage) next.delete(id);
      else next.add(id);
    }
    onSelectedChange(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-sm border transition-opacity',
        fetching && 'opacity-60',
      )}
      aria-busy={fetching}
    >
      <Table>
        <TableHeader className='bg-muted/50'>
          <TableRow className='hover:bg-transparent'>
            <TableHead className='h-10 w-10 pl-4'>
              <Checkbox
                aria-label='Chọn tất cả sản phẩm trên trang'
                checked={allOnPage}
                indeterminate={selectedOnPage > 0 && !allOnPage}
                onCheckedChange={togglePage}
              />
            </TableHead>
            {[
              ['Sản phẩm', ''],
              ['Danh mục', 'hidden lg:table-cell'],
              ['Giá', 'text-right'],
              ['Biến thể', 'hidden text-right md:table-cell'],
              ['Đã bán', 'hidden text-right xl:table-cell'],
              ['Trạng thái', ''],
              ['Cập nhật', 'hidden xl:table-cell'],
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
          {products.map((product) => {
            const image = product.images[0];
            const checked = selected.has(product.id);
            return (
              <TableRow
                key={product.id}
                data-state={checked ? 'selected' : undefined}
              >
                <TableCell className='pl-4'>
                  <Checkbox
                    aria-label={`Chọn "${product.name}"`}
                    checked={checked}
                    onCheckedChange={() => toggleOne(product.id)}
                  />
                </TableCell>
                <TableCell className='max-w-0 min-w-56 py-2 lg:min-w-72'>
                  <div className='flex items-center gap-3'>
                    <span className='flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-muted text-muted-foreground'>
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image.url}
                          alt=''
                          loading='lazy'
                          className='size-full object-cover'
                        />
                      ) : (
                        <HugeiconsIcon
                          icon={Image01Icon}
                          size={16}
                          strokeWidth={1.5}
                        />
                      )}
                    </span>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className='grid min-w-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    >
                      <span className='flex min-w-0 items-center gap-1.5'>
                        <span className='truncate font-medium hover:underline'>
                          {product.name}
                        </span>
                        {product.isFeatured && (
                          <HugeiconsIcon
                            icon={StarIcon}
                            size={14}
                            strokeWidth={1.75}
                            className='shrink-0 text-muted-foreground'
                            aria-label='Nổi bật'
                          />
                        )}
                      </span>
                      <span className='truncate font-mono text-xs text-muted-foreground'>
                        {product.slug}
                      </span>
                    </Link>
                  </div>
                </TableCell>
                <TableCell className='hidden text-muted-foreground lg:table-cell'>
                  {product.category.name}
                </TableCell>
                <TableCell className='text-right tabular-nums'>
                  {priceRange(product)}
                </TableCell>
                <TableCell className='hidden text-right text-muted-foreground tabular-nums md:table-cell'>
                  {product._count.variants}
                </TableCell>
                <TableCell className='hidden text-right text-muted-foreground tabular-nums xl:table-cell'>
                  {product.soldCount}
                </TableCell>
                <TableCell>
                  <ProductStatusBadge status={product.status} />
                </TableCell>
                <TableCell className='hidden text-muted-foreground tabular-nums xl:table-cell'>
                  {format(new Date(product.updatedAt), 'dd/MM/yyyy', {
                    locale: vi,
                  })}
                </TableCell>
                <TableCell className='pr-3 text-right'>
                  <RowMenu
                    product={product}
                    busy={busyID === product.id}
                    {...actions}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function RowMenu({
  product,
  busy,
  onToggleFeatured,
  onChangeStatus,
  onDelete,
}: ProductRowActions & { product: AdminProductListItem; busy: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            size='icon-sm'
            className='rounded-sm text-muted-foreground'
            aria-label={`Thao tác với "${product.name}"`}
            disabled={busy}
          />
        }
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56 rounded-sm'>
        <DropdownMenuItem
          className='rounded-sm'
          render={<Link href={`/admin/products/${product.id}`} />}
        >
          <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={1.75} />
          Sửa
        </DropdownMenuItem>
        {product.status === 'active' && (
          <DropdownMenuItem
            className='rounded-sm'
            render={
              <Link
                href={`/products/${product.slug}`}
                target='_blank'
                rel='noopener'
              />
            }
          >
            <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.75} />
            Xem trên cửa hàng
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className='rounded-sm'
          onClick={() => onToggleFeatured(product)}
        >
          <HugeiconsIcon
            icon={product.isFeatured ? StarOffIcon : StarIcon}
            strokeWidth={1.75}
          />
          {product.isFeatured ? 'Bỏ nổi bật' : 'Đánh dấu nổi bật'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className='px-3 py-1.5'>
            Chuyển trạng thái
          </DropdownMenuLabel>
          {(Object.keys(PRODUCT_STATUSES) as ProductStatus[])
            .filter((status) => status !== product.status)
            .map((status) => (
              <DropdownMenuItem
                key={status}
                className='rounded-sm'
                onClick={() => onChangeStatus(product, status)}
              >
                {PRODUCT_STATUSES[status]}
              </DropdownMenuItem>
            ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant='destructive'
          className='rounded-sm'
          onClick={() => onDelete(product)}
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.75} />
          Xóa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
