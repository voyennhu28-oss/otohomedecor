'use client';

import {
  Cancel01Icon,
  FilterIcon,
  MoreHorizontalIcon,
  StarIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTablePagination } from '@/components/admin/data-table-pagination';
import {
  DataTableSkeleton,
  DataTableState,
} from '@/components/admin/data-table-state';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { RatingStars } from '@/components/rating-stars';
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
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  REVIEW_FILTER_DEFAULTS,
  STATUS_ACTIONS,
  toReviewQuery,
} from '@/features/admin-reviews/filters';
import {
  useAdminReviews,
  useUpdateReviewStatus,
} from '@/features/admin-reviews/hooks/use-admin-reviews';
import {
  REVIEW_STATUSES,
  type AdminReviewListItem,
  type ReviewStatus,
} from '@/features/reviews/types';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

import {
  ReviewImageDialog,
  type ReviewImageTarget,
} from './review-image-dialog';

const TABS = { '': 'Tất cả', ...REVIEW_STATUSES } as const;

export function ReviewsManager() {
  const { values, setValues, reset } = useUrlFilters(REVIEW_FILTER_DEFAULTS);
  const query = useMemo(() => toReviewQuery(values), [values]);
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useAdminReviews(query);
  const update = useUpdateReviewStatus();
  const [viewing, setViewing] = useState<ReviewImageTarget | null>(null);
  const filtering = !!(query.status || query.rating || query.productID);

  const changeStatus = (review: AdminReviewListItem, status: ReviewStatus) =>
    update.mutate(
      { id: review.id, status },
      {
        onSuccess: () =>
          toast.success(
            status === 'approved'
              ? 'Đánh giá đã hiển thị ở cửa hàng'
              : status === 'hidden'
                ? 'Đã ẩn đánh giá'
                : 'Đã chuyển về chờ duyệt',
          ),
        onError: (err) => toast.error(err.message),
      },
    );

  return (
    <>
      <AdminPageHeader
        title='Đánh giá'
        description='Đánh giá mới hiện ngay ở cửa hàng. Ẩn hoặc đưa về chờ duyệt nếu không phù hợp; điểm sản phẩm chỉ tính đánh giá đang hiển thị.'
      />

      <div className='flex flex-col gap-4'>
        <Tabs
          value={query.status ?? 'all'}
          onValueChange={(value) =>
            setValues({ status: value === 'all' ? '' : String(value) })
          }
        >
          <TabsList variant='line' className='w-full justify-start border-b'>
            {Object.entries(TABS).map(([key, label]) => (
              <TabsTrigger
                key={key || 'all'}
                value={key || 'all'}
                className='flex-none px-3'
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className='flex flex-wrap items-center gap-2'>
          <NativeSelect
            size='sm'
            value={query.rating ? String(query.rating) : ''}
            onChange={(event) => setValues({ rating: event.target.value })}
            aria-label='Lọc theo số sao'
            className={cn(
              '[&_select]:rounded-sm',
              query.rating &&
                '[&_select]:border-foreground/40 [&_select]:bg-background',
            )}
          >
            <NativeSelectOption value=''>Mọi số sao</NativeSelectOption>
            {[5, 4, 3, 2, 1].map((rating) => (
              <NativeSelectOption key={rating} value={rating}>
                {rating} sao
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {query.productID && (
            <Badge
              variant='outline'
              className='h-8 gap-1.5 rounded-sm border-foreground/40 pr-1 pl-2.5 text-sm font-normal'
            >
              Sản phẩm: {values.pname || 'đã chọn'}
              <button
                type='button'
                aria-label='Bỏ lọc theo sản phẩm'
                onClick={() => setValues({ product: '', pname: '' })}
                className='rounded-sm p-0.5 text-muted-foreground hover:text-foreground'
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
              </button>
            </Badge>
          )}
          {filtering && (
            <Button
              variant='ghost'
              size='sm'
              className='rounded-sm text-muted-foreground'
              onClick={reset}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {isPending ? (
          <DataTableSkeleton label='Đang tải đánh giá' />
        ) : isError ? (
          <DataTableState
            title='Không tải được đánh giá'
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
          <DataTableState
            icon={filtering ? undefined : StarIcon}
            title={filtering ? 'Không có đánh giá phù hợp' : 'Chưa có đánh giá'}
            description={
              filtering
                ? undefined
                : 'Khách viết đánh giá sau khi đơn chứa sản phẩm đã giao.'
            }
            action={
              filtering && (
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
          <>
            <ul
              className={cn(
                'flex flex-col gap-3 transition-opacity',
                isFetching && isPlaceholderData && 'opacity-60',
              )}
            >
              {data.list.map((review) => (
                <li
                  key={review.id}
                  className={cn(
                    'flex flex-col gap-3 rounded-sm border p-4',
                    review.status !== 'approved' && 'bg-muted/30',
                  )}
                >
                  <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                    <RatingStars rating={review.rating} />
                    <Badge
                      variant={
                        review.status === 'approved' ? 'secondary' : 'outline'
                      }
                      className='rounded-sm'
                    >
                      {REVIEW_STATUSES[review.status]}
                    </Badge>
                    <span className='text-xs text-muted-foreground tabular-nums'>
                      {formatDateTime(review.createdAt)}
                      {review.updatedAt !== review.createdAt && ' · đã sửa'}
                    </span>
                    <div className='ml-auto flex items-center gap-1'>
                      {review.status !== 'approved' && (
                        <Button
                          variant='outline'
                          size='xs'
                          className='rounded-sm'
                          disabled={
                            update.isPending &&
                            update.variables?.id === review.id
                          }
                          onClick={() => changeStatus(review, 'approved')}
                        >
                          Hiển thị
                        </Button>
                      )}
                      {review.status === 'approved' && (
                        <Button
                          variant='ghost'
                          size='xs'
                          className='rounded-sm text-muted-foreground'
                          disabled={
                            update.isPending &&
                            update.variables?.id === review.id
                          }
                          onClick={() => changeStatus(review, 'hidden')}
                        >
                          Ẩn
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant='ghost'
                              size='icon-xs'
                              className='rounded-sm text-muted-foreground'
                              aria-label='Thao tác khác'
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
                          {(Object.keys(STATUS_ACTIONS) as ReviewStatus[])
                            .filter((status) => status !== review.status)
                            .map((status) => (
                              <DropdownMenuItem
                                key={status}
                                className='rounded-sm'
                                onClick={() => changeStatus(review, status)}
                              >
                                {STATUS_ACTIONS[status]}
                              </DropdownMenuItem>
                            ))}
                          {review.product && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className='rounded-sm'
                                onClick={() =>
                                  setValues({
                                    product: review.product?.id ?? '',
                                    pname: review.product?.name ?? '',
                                  })
                                }
                              >
                                <HugeiconsIcon
                                  icon={FilterIcon}
                                  strokeWidth={1.75}
                                />
                                Xem đánh giá của sản phẩm này
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {review.comment ? (
                    <p className='text-sm whitespace-pre-line'>
                      {review.comment}
                    </p>
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      Không có nhận xét.
                    </p>
                  )}

                  {review.images.length > 0 && (
                    <div className='flex flex-wrap gap-2'>
                      {review.images.map((image, index) => (
                        <button
                          key={image.publicID ?? image.url}
                          type='button'
                          onClick={() => setViewing({ review, image })}
                          aria-label={`Xem ảnh ${index + 1}`}
                          className='size-16 overflow-hidden rounded-lg border outline-none focus-visible:ring-2 focus-visible:ring-ring'
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.url}
                            alt=''
                            loading='lazy'
                            className='size-full object-cover'
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className='flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground'>
                    <span>
                      {review.user ? (
                        <>
                          <span className='text-foreground'>
                            {review.user.fullName}
                          </span>{' '}
                          · {review.user.email}
                        </>
                      ) : (
                        'Tài khoản đã xóa'
                      )}
                    </span>
                    {review.product ? (
                      <Link
                        href={`/admin/products/${review.product.id}`}
                        className='hover:text-foreground hover:underline'
                      >
                        {review.product.name}
                      </Link>
                    ) : (
                      <span>Sản phẩm đã xóa</span>
                    )}
                    <Link
                      href={`/admin/orders/${review.orderID}`}
                      className='hover:text-foreground hover:underline'
                    >
                      Xem đơn
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
            <DataTablePagination
              page={query.page ?? 1}
              pageSize={query.itemPerPage ?? 20}
              totalItems={data.totalItems}
              totalPages={data.totalPages}
              itemLabel='đánh giá'
              onPageChange={(page) => setValues({ page: String(page) })}
              onPageSizeChange={(size) => setValues({ size: String(size) })}
            />
          </>
        )}
      </div>

      <ReviewImageDialog target={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
