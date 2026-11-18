'use client';

import {
  Add01Icon,
  Copy01Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilEdit02Icon,
  ViewIcon,
  ViewOffSlashIcon,
  WarehouseIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  ConfirmDialog,
  type ConfirmContent,
} from '@/components/admin/confirm-dialog';
import { DataTableState } from '@/components/admin/data-table-state';
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
  useDeleteVariant,
  useUpdateVariant,
} from '@/features/admin-products/hooks/use-admin-products';
import type {
  AdminProductDetail,
  ProductVariant,
} from '@/features/products/types';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

import { StockDialog } from './stock-dialog';
import {
  VariantFormDialog,
  type VariantFormTarget,
} from './variant-form-dialog';

const LOW_STOCK = 5;

export function ProductVariantsTab({
  product,
}: {
  product: AdminProductDetail;
}) {
  const [formTarget, setFormTarget] = useState<VariantFormTarget | null>(null);
  const [stockTarget, setStockTarget] = useState<ProductVariant | null>(null);
  const [deleting, setDeleting] = useState<ProductVariant | null>(null);
  const update = useUpdateVariant(product.id);
  const remove = useDeleteVariant(product.id);

  const variants = product.variants;
  const activeCount = variants.filter((variant) => variant.isActive).length;
  const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const isLastActive = (variant: ProductVariant) =>
    product.status === 'active' && variant.isActive && activeCount <= 1;

  const toggleActive = (variant: ProductVariant) =>
    update.mutate(
      { variantID: variant.id, body: { isActive: !variant.isActive } },
      {
        onSuccess: () =>
          toast.success(
            variant.isActive
              ? `Đã ngừng bán "${variant.name}"`
              : `"${variant.name}" đã mở bán`,
          ),
        onError: (error) => toast.error(error.message),
      },
    );

  const confirmContent: ConfirmContent | null = deleting && {
    title: 'Xóa biến thể?',
    description: `"${deleting.name}" (${deleting.sku}) sẽ bị xóa. Giỏ hàng đang có biến thể này sẽ báo ngừng bán. Đơn hàng cũ không bị ảnh hưởng.`,
    confirmLabel: 'Xóa biến thể',
    destructive: true,
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-sm text-muted-foreground'>
          {variants.length} biến thể · {activeCount} đang bán · tổng tồn kho{' '}
          <span className='text-foreground tabular-nums'>{totalStock}</span>
          {product.allowBackorder && ' · hàng đặt làm (bán cả khi hết kho)'}
        </p>
        <Button
          size='sm'
          className='rounded-sm'
          disabled={variants.length >= 50}
          onClick={() => setFormTarget({ mode: 'create' })}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          Thêm biến thể
        </Button>
      </div>

      {variants.length === 0 ? (
        <DataTableState
          icon={PackageIcon}
          title='Chưa có biến thể'
          description='Sản phẩm cần ít nhất 1 biến thể đang bán để hiện ở cửa hàng.'
        />
      ) : (
        <div className='overflow-hidden rounded-sm border'>
          <Table>
            <TableHeader className='bg-muted/50'>
              <TableRow className='hover:bg-transparent'>
                {[
                  ['Biến thể', 'pl-4'],
                  ['Thuộc tính', 'hidden md:table-cell'],
                  ['Giá', 'text-right'],
                  ['Tồn kho', 'text-right'],
                  ['Trạng thái', 'hidden sm:table-cell'],
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
              {variants.map((variant) => (
                <TableRow
                  key={variant.id}
                  className={cn(!variant.isActive && 'text-muted-foreground')}
                >
                  <TableCell className='py-2.5 pl-4'>
                    <button
                      type='button'
                      onClick={() => setFormTarget({ mode: 'edit', variant })}
                      className='grid min-w-0 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    >
                      <span
                        className={cn(
                          'truncate font-medium hover:underline',
                          variant.isActive && 'text-foreground',
                        )}
                      >
                        {variant.name}
                      </span>
                      <span className='truncate font-mono text-xs text-muted-foreground'>
                        {variant.sku}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className='hidden md:table-cell'>
                    {variant.options.length === 0 ? (
                      <span className='text-muted-foreground'>—</span>
                    ) : (
                      <div className='flex flex-wrap gap-1'>
                        {variant.options.map((option) => (
                          <Badge
                            key={`${option.name}-${option.value}`}
                            variant='outline'
                            className='rounded-sm font-normal'
                          >
                            <span className='text-muted-foreground'>
                              {option.name}:
                            </span>
                            {option.value}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    <div className='font-medium'>
                      {formatVND(variant.price)}
                    </div>
                    {variant.compareAtPrice && (
                      <div className='text-xs text-muted-foreground line-through'>
                        {formatVND(variant.compareAtPrice)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className='text-right'>
                    <button
                      type='button'
                      onClick={() => setStockTarget(variant)}
                      title='Điều chỉnh tồn kho'
                      className={cn(
                        'rounded-sm px-1.5 py-0.5 tabular-nums underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring',
                        variant.stock === 0
                          ? 'font-medium text-destructive'
                          : variant.stock <= LOW_STOCK && 'font-medium',
                      )}
                    >
                      {variant.stock === 0 ? 'Hết hàng' : variant.stock}
                    </button>
                  </TableCell>
                  <TableCell className='hidden sm:table-cell'>
                    <Badge
                      variant={variant.isActive ? 'secondary' : 'outline'}
                      className='rounded-sm'
                    >
                      {variant.isActive ? 'Đang bán' : 'Ngừng bán'}
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
                            aria-label={`Thao tác với "${variant.name}"`}
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
                        className='w-56 rounded-sm'
                      >
                        <DropdownMenuItem
                          className='rounded-sm'
                          onClick={() =>
                            setFormTarget({ mode: 'edit', variant })
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
                          onClick={() => setStockTarget(variant)}
                        >
                          <HugeiconsIcon
                            icon={WarehouseIcon}
                            strokeWidth={1.75}
                          />
                          Điều chỉnh tồn kho
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='rounded-sm'
                          disabled={variants.length >= 50}
                          onClick={() =>
                            setFormTarget({ mode: 'create', copyFrom: variant })
                          }
                        >
                          <HugeiconsIcon icon={Copy01Icon} strokeWidth={1.75} />
                          Nhân bản
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='rounded-sm'
                          disabled={isLastActive(variant)}
                          onClick={() => toggleActive(variant)}
                        >
                          <HugeiconsIcon
                            icon={
                              variant.isActive ? ViewOffSlashIcon : ViewIcon
                            }
                            strokeWidth={1.75}
                          />
                          {variant.isActive ? 'Ngừng bán' : 'Mở bán'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant='destructive'
                          className='rounded-sm'
                          disabled={isLastActive(variant)}
                          onClick={() => setDeleting(variant)}
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {product.status === 'active' && activeCount <= 1 && (
        <p className='text-xs text-muted-foreground'>
          Sản phẩm đang bán phải còn ít nhất 1 biến thể đang bán: muốn ngừng bán
          / xóa biến thể cuối, hãy thêm biến thể khác hoặc chuyển sản phẩm sang
          &quot;Nháp&quot; / &quot;Ngừng bán&quot;.
        </p>
      )}

      <VariantFormDialog
        productID={product.id}
        target={formTarget}
        onClose={() => setFormTarget(null)}
      />
      <StockDialog variant={stockTarget} onClose={() => setStockTarget(null)} />
      <ConfirmDialog
        content={confirmContent}
        pending={remove.isPending}
        pendingLabel='Đang xóa…'
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success(`Đã xóa biến thể "${deleting.name}"`);
              setDeleting(null);
            },
            onError: (error) => toast.error(error.message),
          });
        }}
      />
    </div>
  );
}
