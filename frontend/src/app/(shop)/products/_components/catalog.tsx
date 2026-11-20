import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { RemoteImage } from '@/components/remote-image';
import { SectionTitle } from '@/components/section-title';
import {
  findCategory,
  getActiveFilters,
} from '@/features/catalog/active-filters';
import {
  type CatalogQuery,
  type CatalogSearchParams,
  catalogHref,
  clearedQuery,
  parseCatalogQuery,
} from '@/features/catalog/product-query';
import {
  getCatalogProducts,
  getCategoryTree,
  getProductFilters,
  getVisibleCollections,
} from '@/features/catalog/queries';
import type { PublicCategoryNode } from '@/features/categories/types';
import type { PublicCollection } from '@/features/collections/types';
import { ProductTile } from '@/features/products/components/product-tile';
import type { ProductCard } from '@/features/products/types';
import { getPageItems } from '@/lib/pagination';
import { cn } from '@/lib/utils';

import { CatalogFilters } from './catalog-filters';
import { CatalogLink, CatalogNavProvider, CatalogResults } from './catalog-nav';
import { CatalogToolbar } from './catalog-toolbar';

const RISE_COUNT = 6;

export async function Catalog({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const query = parseCatalogQuery(await searchParams);
  const [page, options, categories, collections] = await Promise.all([
    getCatalogProducts(query),
    getProductFilters(query.category, query.collection),
    getCategoryTree(),
    getVisibleCollections(),
  ]);

  const collection = collections.find((item) => item.slug === query.collection);
  const category = findCategory(categories, query.category);
  const activeFilters = getActiveFilters(query, { categories, collections });
  const filterProps = { query, options, categories, collections };

  return (
    <CatalogNavProvider>
      {collection ? (
        <CollectionHero collection={collection} />
      ) : (
        <CatalogHeader category={category} />
      )}

      <div className='container mx-auto px-6 pb-24 md:pb-32'>
        <div className='grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] xl:gap-16'>
          <aside aria-label='Bộ lọc sản phẩm' className='hidden lg:block'>
            <div className='sticky top-28 no-scrollbar max-h-[calc(100svh-8rem)] overflow-y-auto pb-10'>
              <CatalogFilters {...filterProps} />
            </div>
          </aside>

          <div className='min-w-0'>
            <CatalogToolbar
              {...filterProps}
              totalItems={page?.totalItems ?? null}
            />

            {activeFilters.length > 0 && (
              <ul
                aria-label='Bộ lọc đang chọn'
                className='flex flex-wrap gap-2 pt-5'
              >
                {activeFilters.map((filter) => (
                  <li key={filter.key}>
                    <CatalogLink
                      href={catalogHref(query, filter.patch)}
                      toResults
                      aria-label={`Bỏ lọc ${filter.label}`}
                      className='group/chip inline-flex h-8 items-center gap-2 rounded-sm bg-secondary/70 pr-2 pl-3 text-sm transition-colors hover:bg-secondary'
                    >
                      {filter.label}
                      <HugeiconsIcon
                        icon={Cancel01Icon}
                        size={12}
                        strokeWidth={2}
                        className='text-muted-foreground group-hover/chip:text-foreground'
                      />
                    </CatalogLink>
                  </li>
                ))}
              </ul>
            )}

            <CatalogResults className='pt-10'>
              {page === null ? (
                <CatalogMessage
                  title='Chưa tải được sản phẩm'
                  note='Kết nối tới cửa hàng đang chậm. Thử tải lại sau ít phút.'
                  href={catalogHref(query, { page: query.page })}
                  action='Tải lại'
                />
              ) : page.list.length === 0 ? (
                <CatalogMessage
                  title='Chưa có mẫu đèn phù hợp'
                  note={
                    activeFilters.length > 0
                      ? 'Thử bỏ bớt bộ lọc, hoặc nhắn cho cửa hàng để đặt làm theo ý bạn.'
                      : 'Xưởng đang hoàn thiện những mẫu mới. Bạn quay lại sau nhé.'
                  }
                  href={catalogHref(clearedQuery({ ...query, q: undefined }))}
                  action={activeFilters.length > 0 ? 'Xóa bộ lọc' : undefined}
                />
              ) : (
                <>
                  <ProductGrid products={page.list} />
                  <CatalogPagination
                    query={query}
                    totalPages={page.totalPages}
                  />
                </>
              )}
            </CatalogResults>
          </div>
        </div>
      </div>
    </CatalogNavProvider>
  );
}

function CatalogHeader({ category }: { category?: PublicCategoryNode }) {
  return (
    <header className='container mx-auto grid gap-6 px-6 pt-14 pb-12 md:grid-cols-12 md:items-end md:pt-20 md:pb-16'>
      <div className='flex flex-col gap-5 md:col-span-7'>
        <p className='label-caps text-muted-foreground motion-safe:animate-rise'>
          {category ? 'Danh mục' : 'Cửa hàng'}
        </p>
        <SectionTitle
          as='h1'
          serif={category ? category.name : 'Tất cả'}
          caps={category ? 'của xưởng' : 'sản phẩm'}
          className='[animation-delay:120ms] motion-safe:animate-rise'
        />
      </div>
      <p className='max-w-prose text-base leading-relaxed text-muted-foreground [animation-delay:240ms] motion-safe:animate-rise md:col-span-5'>
        {category?.description ??
          'Mỗi chiếc đèn được ghép tay từ vỏ sò thật, nên vân vỏ ở chiếc bạn nhận sẽ khác ảnh một chút. Đó là dấu tay riêng của từng chiếc.'}
      </p>
    </header>
  );
}

function CollectionHero({ collection }: { collection: PublicCollection }) {
  return (
    <header className='mb-12 grid bg-muted/60 md:mb-16 lg:grid-cols-[3fr_2fr] lg:items-center'>
      <div className='relative aspect-video overflow-hidden lg:aspect-auto lg:h-full lg:min-h-112'>
        {collection.image ? (
          <RemoteImage
            src={collection.image.url}
            alt={collection.image.alt ?? `Bộ sưu tập ${collection.name}`}
            sizes='(min-width: 1024px) 60vw, 100vw'
            loading='eager'
            fetchPriority='high'
            className='object-cover motion-safe:animate-settle'
          />
        ) : (
          <div className='absolute inset-0 bg-secondary' />
        )}
      </div>
      <div className='flex flex-col items-start gap-5 px-6 py-12 md:px-12 xl:px-20'>
        <p className='label-caps text-muted-foreground [animation-delay:100ms] motion-safe:animate-rise'>
          Bộ sưu tập
        </p>
        <h1 className='text-5xl leading-[1.05] text-balance [animation-delay:220ms] motion-safe:animate-rise md:text-6xl'>
          {collection.name}
        </h1>
        {collection.description && (
          <p className='max-w-[46ch] text-base leading-relaxed text-muted-foreground [animation-delay:340ms] motion-safe:animate-rise'>
            {collection.description}
          </p>
        )}
      </div>
    </header>
  );
}

function ProductGrid({ products }: { products: ProductCard[] }) {
  return (
    <ul className='grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 md:gap-y-16 xl:grid-cols-3'>
      {products.map((product, index) => (
        <li
          key={product.id}
          className={index < RISE_COUNT ? 'motion-safe:animate-rise' : 'reveal'}
          style={
            index < RISE_COUNT
              ? { animationDelay: `${index * 70}ms` }
              : undefined
          }
        >
          <ProductTile
            product={product}
            dense
            sizes='(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw'
          />
        </li>
      ))}
    </ul>
  );
}

function CatalogMessage({
  title,
  note,
  href,
  action,
}: {
  title: string;
  note: string;
  href: string;
  action?: string;
}) {
  return (
    <div className='flex min-h-72 flex-col items-start justify-center gap-3 rounded-lg bg-secondary/40 p-8 md:p-12'>
      <p className='font-heading text-3xl'>{title}</p>
      <p className='max-w-[48ch] text-sm leading-relaxed text-muted-foreground'>
        {note}
      </p>
      {action && (
        <CatalogLink
          href={href}
          className='mt-3 inline-flex h-11 items-center rounded-sm border border-foreground px-5 label-caps transition-colors hover:bg-foreground hover:text-background'
        >
          {action}
        </CatalogLink>
      )}
    </div>
  );
}

function CatalogPagination({
  query,
  totalPages,
}: {
  query: CatalogQuery;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const current = Math.min(query.page, totalPages);

  return (
    <nav
      aria-label='Phân trang sản phẩm'
      className='mt-16 flex items-center justify-between gap-4 border-t pt-8 md:mt-20'
    >
      <PageStep
        query={query}
        page={current - 1}
        disabled={current <= 1}
        direction='prev'
      />
      <p className='text-sm text-muted-foreground tabular-nums sm:hidden'>
        Trang {current} / {totalPages}
      </p>
      <ul className='hidden items-center gap-1 sm:flex'>
        {getPageItems(current, totalPages).map((item, index) =>
          item === 'ellipsis' ? (
            <li
              key={`ellipsis-${index}`}
              aria-hidden
              className='w-10 text-center text-muted-foreground'
            >
              …
            </li>
          ) : (
            <li key={item}>
              <CatalogLink
                href={catalogHref(query, { page: item })}
                toResults
                aria-label={`Trang ${item}`}
                aria-current={item === current ? 'page' : undefined}
                className={cn(
                  'flex size-10 items-center justify-center rounded-sm text-sm tabular-nums transition-colors',
                  item === current
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                {item}
              </CatalogLink>
            </li>
          ),
        )}
      </ul>
      <PageStep
        query={query}
        page={current + 1}
        disabled={current >= totalPages}
        direction='next'
      />
    </nav>
  );
}

function PageStep({
  query,
  page,
  disabled,
  direction,
}: {
  query: CatalogQuery;
  page: number;
  disabled: boolean;
  direction: 'prev' | 'next';
}) {
  const label = direction === 'prev' ? 'Trang trước' : 'Trang sau';
  const content = (
    <>
      {direction === 'prev' && (
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.75} />
      )}
      <span className='label-caps'>{label}</span>
      {direction === 'next' && (
        <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.75} />
      )}
    </>
  );
  const className = 'inline-flex h-11 items-center gap-2 rounded-sm px-2';

  if (disabled) {
    return (
      <span aria-disabled className={cn(className, 'text-muted-foreground/50')}>
        {content}
      </span>
    );
  }
  return (
    <CatalogLink
      href={catalogHref(query, { page })}
      toResults
      rel={direction}
      className={cn(className, 'hover:bg-secondary')}
    >
      {content}
    </CatalogLink>
  );
}
