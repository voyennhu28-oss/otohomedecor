'use client';

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useState } from 'react';

import { RatingStars } from '@/components/rating-stars';
import { RemoteImage } from '@/components/remote-image';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { UserAvatar } from '@/features/auth/components/user-avatar';
import { REVIEW_PAGE_SIZE } from '@/features/reviews/constants';
import {
  type ProductReviewPage,
  type PublicReview,
  REVIEW_SORTS,
  type ReviewSort,
  type ReviewStats,
} from '@/features/reviews/types';
import { cn } from '@/lib/utils';
import { reviewService } from '@/services/review.service';

const STARS = [5, 4, 3, 2, 1] as const;
const ratingFormat = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function ProductReviews({
  productID,
  initial,
}: {
  productID: string;
  initial: ProductReviewPage | null;
}) {
  const [rating, setRating] = useState<number | undefined>();
  const [sort, setSort] = useState<ReviewSort>('newest');
  const isDefault = rating === undefined && sort === 'newest';

  const query = useInfiniteQuery({
    queryKey: ['product-reviews', productID, rating ?? 'all', sort],
    queryFn: ({ pageParam }) =>
      reviewService.productReviews(productID, {
        rating,
        sort,
        page: pageParam,
        itemPerPage: REVIEW_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      pages.length < last.totalPages ? pages.length + 1 : undefined,
    initialData:
      isDefault && initial ? { pages: [initial], pageParams: [1] } : undefined,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const stats = initial?.stats ?? query.data?.pages[0]?.stats;
  const reviews = query.data?.pages.flatMap((page) => page.list) ?? [];

  if (!stats) {
    return query.isError ? (
      <p className='text-sm text-muted-foreground'>
        Chưa tải được đánh giá. Thử tải lại trang.
      </p>
    ) : null;
  }

  if (stats.count === 0) {
    return (
      <div className='flex flex-col items-start gap-2 rounded-lg bg-secondary/40 p-8'>
        <p className='font-heading text-2xl'>Chưa có đánh giá</p>
        <p className='max-w-[52ch] text-sm leading-relaxed text-muted-foreground'>
          Đánh giá được viết sau khi đơn hàng đã giao. Bạn có thể là người đầu
          tiên kể về chiếc đèn này.
        </p>
      </div>
    );
  }

  return (
    <div className='grid gap-12 lg:grid-cols-12 lg:gap-16'>
      <div className='flex flex-col gap-6 lg:col-span-4'>
        <div className='flex items-end gap-4'>
          <p className='font-heading text-7xl leading-none tabular-nums'>
            {ratingFormat.format(stats.average)}
          </p>
          <div className='flex flex-col gap-1.5 pb-1.5'>
            <RatingStars
              rating={Math.round(stats.average)}
              className='text-base'
            />
            <p className='text-sm text-muted-foreground'>
              {stats.count} đánh giá
            </p>
          </div>
        </div>
        <Distribution
          stats={stats}
          active={rating}
          onSelect={(star) =>
            setRating((current) => (current === star ? undefined : star))
          }
        />
      </div>

      <div className='flex flex-col gap-8 lg:col-span-8'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p className='text-sm text-muted-foreground'>
            {rating ? `Đánh giá ${rating} sao` : 'Tất cả đánh giá'}
          </p>
          <NativeSelect
            value={sort}
            aria-label='Sắp xếp đánh giá'
            onChange={(event) => setSort(event.target.value as ReviewSort)}
            className='[&_select]:h-10 [&_select]:rounded-sm [&_select]:bg-background'
          >
            {(Object.entries(REVIEW_SORTS) as [ReviewSort, string][]).map(
              ([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ),
            )}
          </NativeSelect>
        </div>

        <ul
          aria-busy={query.isFetching}
          className={cn(
            'flex flex-col transition-opacity duration-300',
            query.isPlaceholderData && 'opacity-50',
          )}
        >
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
          {reviews.length === 0 && !query.isFetching && (
            <li className='border-t py-8 text-sm text-muted-foreground'>
              Chưa có đánh giá {rating} sao.
            </li>
          )}
        </ul>

        {query.hasNextPage && (
          <button
            type='button'
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className='self-start rounded-sm border border-foreground px-6 py-3 label-caps transition-colors hover:bg-foreground hover:text-background disabled:opacity-50'
          >
            {query.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm đánh giá'}
          </button>
        )}
      </div>
    </div>
  );
}

function Distribution({
  stats,
  active,
  onSelect,
}: {
  stats: ReviewStats;
  active: number | undefined;
  onSelect: (star: number) => void;
}) {
  return (
    <ul aria-label='Lọc theo số sao' className='flex flex-col gap-1'>
      {STARS.map((star) => {
        const count =
          stats.distribution[String(star) as keyof ReviewStats['distribution']];
        const width = stats.count ? (count / stats.count) * 100 : 0;
        return (
          <li key={star}>
            <button
              type='button'
              aria-pressed={active === star}
              disabled={count === 0}
              onClick={() => onSelect(star)}
              className={cn(
                'grid w-full grid-cols-[2.5rem_1fr_2rem] items-center gap-3 rounded-sm px-2 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50',
                active === star ? 'bg-secondary' : 'enabled:hover:bg-muted',
              )}
            >
              <span className='text-left tabular-nums'>{star} ★</span>
              <span className='h-1 overflow-hidden rounded-full bg-border'>
                <span
                  className='block h-full bg-foreground transition-[width] duration-700 ease-soft'
                  style={{ width: `${width}%` }}
                />
              </span>
              <span className='text-right text-muted-foreground tabular-nums'>
                {count}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ReviewItem({ review }: { review: PublicReview }) {
  const images = [...review.images].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <li className='flex flex-col gap-4 border-t py-8 first:border-t-0 first:pt-0'>
      <div className='flex items-center gap-3'>
        <UserAvatar user={review.user} className='size-10' />
        <div className='min-w-0'>
          <p className='text-sm font-medium'>{review.user.fullName}</p>
          <p className='text-xs text-muted-foreground'>
            <time dateTime={review.createdAt}>
              {format(new Date(review.createdAt), 'd MMMM, yyyy', {
                locale: vi,
              })}
            </time>
          </p>
        </div>
        <RatingStars rating={review.rating} className='ml-auto' />
      </div>
      {review.comment && (
        <p className='max-w-[65ch] text-base leading-relaxed whitespace-pre-line'>
          {review.comment}
        </p>
      )}
      {images.length > 0 && (
        <ul className='flex flex-wrap gap-2'>
          {images.map((image, index) => (
            <li key={image.url}>
              <a
                href={image.url}
                target='_blank'
                rel='noreferrer'
                className='relative block size-20 overflow-hidden rounded-sm bg-secondary/45'
                aria-label={`Ảnh ${index + 1} của đánh giá, mở trong tab mới`}
              >
                <RemoteImage
                  src={image.url}
                  alt=''
                  sizes='80px'
                  className='object-cover'
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
