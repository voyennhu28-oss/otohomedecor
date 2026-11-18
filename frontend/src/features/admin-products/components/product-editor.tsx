'use client';

import {
  ArrowLeft01Icon,
  ArrowUpRight01Icon,
  Delete02Icon,
  StarIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  ConfirmDialog,
  type ConfirmContent,
} from '@/components/admin/confirm-dialog';
import {
  DataTableSkeleton,
  DataTableState,
} from '@/components/admin/data-table-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAdminProduct,
  useDeleteProduct,
} from '@/features/admin-products/hooks/use-admin-products';
import { ApiError } from '@/lib/api-client';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';
import { parseOption, useUrlFilters } from '@/hooks/use-url-filters';

import { ProductImagesTab } from './product-images-tab';
import { ProductInfoTab } from './product-info-tab';
import { ProductStatusBadge } from './product-status-badge';
import { ProductVariantsTab } from './product-variants-tab';

const TABS = ['info', 'variants', 'images'] as const;
type Tab = (typeof TABS)[number];

export function ProductEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    data: product,
    isPending,
    isError,
    error,
    refetch,
  } = useAdminProduct(id);
  const remove = useDeleteProduct();
  const { values, setValues } = useUrlFilters({ tab: 'info' });
  const tab = parseOption<Tab>(values.tab, TABS, 'info');
  const [confirming, setConfirming] = useState(false);

  if (isPending)
    return <DataTableSkeleton label='Đang tải sản phẩm' rows={4} />;

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <DataTableState
        title={notFound ? 'Không tìm thấy sản phẩm' : 'Không tải được sản phẩm'}
        description={
          notFound ? 'Sản phẩm không tồn tại hoặc đã bị xóa.' : error.message
        }
        action={
          notFound ? (
            <Link
              href='/admin/products'
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'rounded-sm',
              )}
            >
              Về danh sách sản phẩm
            </Link>
          ) : (
            <Button
              variant='outline'
              size='sm'
              className='rounded-sm'
              onClick={() => refetch()}
            >
              Thử lại
            </Button>
          )
        }
      />
    );
  }

  const priceText =
    product.minPrice === 0
      ? 'Chưa có giá'
      : product.minPrice === product.maxPrice
        ? formatVND(product.minPrice)
        : `${formatVND(product.minPrice)} – ${formatVND(product.maxPrice)}`;

  const confirmContent: ConfirmContent | null = confirming
    ? {
        title: 'Xóa sản phẩm?',
        description: `"${product.name}" và mọi biến thể sẽ bị xóa khỏi cửa hàng. Đơn hàng cũ không bị ảnh hưởng. Slug và SKU dùng lại được sau khi xóa.`,
        confirmLabel: 'Xóa sản phẩm',
        destructive: true,
      }
    : null;

  return (
    <>
      <Link
        href='/admin/products'
        className='mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.75} />
        Sản phẩm
      </Link>

      <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex min-w-0 items-start gap-4'>
          <div className='size-16 shrink-0 overflow-hidden rounded-lg border bg-muted'>
            {product.images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[0].url}
                alt=''
                className='size-full object-cover'
              />
            )}
          </div>
          <div className='min-w-0'>
            <h1 className='truncate text-3xl leading-tight'>{product.name}</h1>
            <div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground'>
              <ProductStatusBadge status={product.status} />
              {product.isFeatured && (
                <span className='inline-flex items-center gap-1'>
                  <HugeiconsIcon icon={StarIcon} size={14} strokeWidth={1.75} />
                  Nổi bật
                </span>
              )}
              <span>{product.category.name}</span>
              <span className='tabular-nums'>{priceText}</span>
              <span>Đã bán {product.soldCount}</span>
            </div>
          </div>
        </div>
        <div className='flex shrink-0 gap-2'>
          {product.status === 'active' && (
            <Link
              href={`/products/${product.slug}`}
              target='_blank'
              rel='noopener'
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'rounded-sm',
              )}
            >
              Xem trên cửa hàng
              <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.75} />
            </Link>
          )}
          <Button
            variant='ghost'
            size='sm'
            className='rounded-sm text-destructive hover:bg-destructive/10 hover:text-destructive'
            onClick={() => setConfirming(true)}
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.75} />
            Xóa
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setValues({ tab: value as Tab })}
        className='gap-6'
      >
        <TabsList variant='line' className='w-full justify-start border-b'>
          <TabsTrigger value='info' className='flex-none px-3'>
            Thông tin
          </TabsTrigger>
          <TabsTrigger value='variants' className='flex-none px-3'>
            Biến thể
            <span className='text-xs text-muted-foreground tabular-nums'>
              {product.variants.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value='images' className='flex-none px-3'>
            Ảnh
            <span className='text-xs text-muted-foreground tabular-nums'>
              {product.images.length}
            </span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value='info' keepMounted>
          <ProductInfoTab product={product} />
        </TabsContent>
        <TabsContent value='variants'>
          <ProductVariantsTab product={product} />
        </TabsContent>
        <TabsContent value='images'>
          <ProductImagesTab product={product} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        content={confirmContent}
        pending={remove.isPending}
        pendingLabel='Đang xóa…'
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          remove.mutate(product.id, {
            onSuccess: () => {
              toast.success(`Đã xóa "${product.name}"`);
              router.replace('/admin/products');
            },
            onError: (err) => toast.error(err.message),
          })
        }
      />
    </>
  );
}
