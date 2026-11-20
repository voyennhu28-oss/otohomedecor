import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { SectionTitle } from '@/components/section-title';
import { Skeleton } from '@/components/ui/skeleton';
import { MATERIALS, ROOMS, STYLES } from '@/constants/catalog';
import {
  catalogHref,
  parseCatalogQuery,
} from '@/features/catalog/product-query';
import {
  getFirstReviews,
  getProduct,
  getRelatedProducts,
} from '@/features/catalog/queries';
import { ProductRail } from '@/features/products/components/product-rail';
import type { ProductDetail } from '@/features/products/types';

import { ProductPurchase } from './product-purchase';
import { ProductReviews } from './product-reviews';

const EMPTY_QUERY = parseCatalogQuery({});

export async function ProductDetailView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getProduct(slug);
  if (result.status === 'missing') notFound();
  if (result.status === 'error') return <ProductUnavailable slug={slug} />;
  const { product } = result;

  return (
    <>
      <div className='container mx-auto px-6 pt-8 pb-20 md:pt-10 md:pb-28'>
        <Breadcrumbs product={product} />
        <ProductPurchase
          product={product}
          header={<ProductHeader product={product} />}
        />
      </div>

      <ProductStory product={product} />

      <section
        aria-labelledby='danh-gia-title'
        className='container mx-auto px-6 py-20 md:py-28'
      >
        <SectionTitle
          id='danh-gia-title'
          serif='Khách hàng'
          caps='nói gì'
          className='mb-12 reveal md:mb-16'
        />
        <Suspense fallback={<Skeleton className='h-48 rounded-lg' />}>
          <Reviews productID={product.id} />
        </Suspense>
      </section>

      <Suspense fallback={null}>
        <RelatedProducts slug={product.slug} />
      </Suspense>
    </>
  );
}

function Breadcrumbs({ product }: { product: ProductDetail }) {
  return (
    <nav aria-label='Đường dẫn' className='mb-8 text-sm text-muted-foreground'>
      <ol className='flex flex-wrap items-center gap-x-2 gap-y-1'>
        <li>
          <Link href='/products' className='hover:text-foreground'>
            Sản phẩm
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li>
          <Link
            href={catalogHref(EMPTY_QUERY, { category: product.category.slug })}
            className='hover:text-foreground'
          >
            {product.category.name}
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li aria-current='page' className='truncate text-foreground'>
          {product.name}
        </li>
      </ol>
    </nav>
  );
}

function ProductHeader({ product }: { product: ProductDetail }) {
  return (
    <div className='flex flex-col gap-4'>
      {product.collections.length > 0 && (
        <p className='label-caps text-muted-foreground'>
          {product.collections.map((collection, index) => (
            <span key={collection.id}>
              {index > 0 && ' · '}
              <Link
                href={catalogHref(EMPTY_QUERY, { collection: collection.slug })}
                className='hover:text-foreground'
              >
                {collection.name}
              </Link>
            </span>
          ))}
        </p>
      )}
      <h1 className='text-4xl leading-[1.1] text-balance md:text-5xl'>
        {product.name}
      </h1>
      {product.ratingCount > 0 && (
        <a
          href='#danh-gia-title'
          className='w-fit text-sm text-muted-foreground hover:text-foreground'
        >
          ★ {product.ratingAvg.toLocaleString('vi-VN')} · {product.ratingCount}{' '}
          đánh giá
          {product.soldCount > 0 && ` · đã bán ${product.soldCount}`}
        </a>
      )}
      {product.shortDescription && (
        <p className='max-w-[48ch] text-base leading-relaxed text-muted-foreground'>
          {product.shortDescription}
        </p>
      )}
    </div>
  );
}

function ProductStory({ product }: { product: ProductDetail }) {
  const specs = [
    {
      term: 'Chất liệu',
      values: product.materials.map((item) => MATERIALS[item]),
    },
    { term: 'Không gian', values: product.rooms.map((item) => ROOMS[item]) },
    { term: 'Phong cách', values: product.styles.map((item) => STYLES[item]) },
    { term: 'Màu sắc', values: product.colors },
  ].filter((spec) => spec.values.length > 0);

  return (
    <section aria-labelledby='cau-chuyen-title' className='bg-muted/60'>
      <div className='container mx-auto grid gap-12 px-6 py-20 md:py-28 lg:grid-cols-12 lg:gap-16'>
        <div className='flex reveal flex-col gap-8 lg:col-span-7'>
          <SectionTitle
            id='cau-chuyen-title'
            serif='Câu chuyện'
            caps='chiếc đèn'
          />
          <p className='max-w-[62ch] text-base leading-relaxed whitespace-pre-line text-muted-foreground md:text-lg'>
            {product.description ??
              product.shortDescription ??
              'Chiếc đèn được ghép tay từ vỏ tự nhiên. Vì vỏ mỗi lứa một khác, vân và sắc độ ở chiếc bạn nhận sẽ gần giống ảnh, không giống hệt.'}
          </p>
        </div>
        <div className='flex reveal flex-col gap-8 [--reveal-delay:8] lg:col-span-4 lg:col-start-9'>
          <dl className='flex flex-col'>
            {specs.map((spec) => (
              <div
                key={spec.term}
                className='grid grid-cols-[7rem_1fr] gap-4 border-b py-4 text-sm first:border-t'
              >
                <dt className='text-muted-foreground'>{spec.term}</dt>
                <dd>{spec.values.join(', ')}</dd>
              </div>
            ))}
            <div className='grid grid-cols-[7rem_1fr] gap-4 border-b py-4 text-sm first:border-t'>
              <dt className='text-muted-foreground'>Danh mục</dt>
              <dd>
                <Link
                  href={catalogHref(EMPTY_QUERY, {
                    category: product.category.slug,
                  })}
                  className='underline underline-offset-4 hover:text-muted-foreground'
                >
                  {product.category.name}
                </Link>
              </dd>
            </div>
          </dl>
          <p className='border-l-2 border-foreground pl-4 font-heading text-xl leading-snug italic'>
            Mỗi chiếc làm tay nên vân vỏ sẽ khác ảnh một chút. Đó là dấu tay
            riêng của chiếc đèn bạn nhận.
          </p>
        </div>
      </div>
    </section>
  );
}

async function Reviews({ productID }: { productID: string }) {
  const initial = await getFirstReviews(productID);
  return <ProductReviews productID={productID} initial={initial} />;
}

async function RelatedProducts({ slug }: { slug: string }) {
  const products = await getRelatedProducts(slug);
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby='lien-quan-title'
      className='container mx-auto grid gap-12 px-6 pb-24 md:pb-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.3fr)] lg:items-center lg:gap-16'
    >
      <SectionTitle
        id='lien-quan-title'
        serif='Có thể bạn'
        caps='cũng thích'
        stacked
        className='reveal'
      />
      <div className='min-w-0 reveal [--reveal-delay:10]'>
        <ProductRail products={products} label='Sản phẩm liên quan' />
      </div>
    </section>
  );
}

function ProductUnavailable({ slug }: { slug: string }) {
  return (
    <div className='container mx-auto flex min-h-[50svh] flex-col items-start justify-center gap-4 px-6 py-20'>
      <p className='font-heading text-4xl'>Chưa tải được sản phẩm</p>
      <p className='max-w-[48ch] text-muted-foreground'>
        Kết nối tới cửa hàng đang chậm. Thử tải lại trang sau ít phút.
      </p>
      <Link
        href={`/products/${slug}`}
        className='mt-2 inline-flex h-11 items-center rounded-sm border border-foreground px-5 label-caps transition-colors hover:bg-foreground hover:text-background'
      >
        Tải lại
      </Link>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div
      role='status'
      aria-label='Đang tải sản phẩm'
      className='container mx-auto px-6 pt-8 pb-20 md:pt-10'
    >
      <Skeleton className='mb-8 h-4 w-64 rounded-sm' />
      <div className='grid gap-10 lg:grid-cols-12 lg:gap-16'>
        <Skeleton className='aspect-square rounded-lg lg:col-span-7' />
        <div className='flex flex-col gap-6 lg:col-span-5'>
          <Skeleton className='h-4 w-32 rounded-sm' />
          <Skeleton className='h-12 w-3/4 rounded-sm' />
          <Skeleton className='h-5 w-full rounded-sm' />
          <Skeleton className='h-10 w-40 rounded-sm' />
          <div className='flex gap-2'>
            <Skeleton className='h-11 w-16 rounded-sm' />
            <Skeleton className='h-11 w-16 rounded-sm' />
            <Skeleton className='h-11 w-16 rounded-sm' />
          </div>
          <Skeleton className='h-14 w-full rounded-sm' />
        </div>
      </div>
    </div>
  );
}
