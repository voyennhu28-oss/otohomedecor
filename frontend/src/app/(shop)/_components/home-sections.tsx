import { SectionTitle } from '@/components/section-title';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getFeaturedProducts,
  getShowcaseCollections,
} from '@/features/catalog/queries';

import { ArrowLink } from './arrow-link';
import { CollectionShowcase } from './collection-showcase';
import { ProductRail } from '@/features/products/components/product-rail';

export async function FeaturedProducts() {
  const products = await getFeaturedProducts(8);

  if (!products || products.length === 0) {
    return (
      <div className='flex min-h-64 flex-col items-start justify-center gap-3 rounded-lg bg-secondary/40 p-8'>
        <p className='font-heading text-2xl'>
          {products ? 'Mẫu mới đang được hoàn thiện' : 'Chưa tải được sản phẩm'}
        </p>
        <p className='max-w-[44ch] text-sm text-muted-foreground'>
          {products
            ? 'Xưởng đang làm những chiếc đèn tiếp theo. Bạn có thể xem toàn bộ sản phẩm hiện có.'
            : 'Kết nối tới cửa hàng đang chậm. Thử tải lại trang hoặc xem danh sách sản phẩm.'}
        </p>
        <ArrowLink href='/products'>Xem tất cả sản phẩm</ArrowLink>
      </div>
    );
  }

  return <ProductRail products={products} label='Sản phẩm nổi bật' />;
}

export function FeaturedProductsSkeleton() {
  return (
    <div
      role='status'
      aria-label='Đang tải sản phẩm nổi bật'
      className='flex gap-6 overflow-hidden'
    >
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className='flex w-[78%] shrink-0 flex-col gap-5 sm:w-[45%] lg:w-[38%]'
        >
          <Skeleton className='aspect-square rounded-lg' />
          <Skeleton className='h-6 w-3/4 rounded-sm' />
          <Skeleton className='h-4 w-1/3 rounded-sm' />
        </div>
      ))}
    </div>
  );
}

export async function CollectionsSection() {
  const collections = await getShowcaseCollections(4);
  if (!collections || collections.length === 0) return null;

  return (
    <section
      aria-labelledby='bo-suu-tap-title'
      className='container mx-auto px-6 py-20 md:py-28'
    >
      <div className='mb-12 grid gap-6 md:mb-16 md:grid-cols-12 md:items-end'>
        <SectionTitle
          id='bo-suu-tap-title'
          serif='Bộ sưu tập'
          caps='của xưởng'
          stacked
          className='reveal md:col-span-6'
        />
        <p className='max-w-prose reveal text-base leading-relaxed text-muted-foreground md:col-span-5 md:col-start-8'>
          Mỗi bộ sưu tập kể một câu chuyện về biển, về phố cổ hay một mùa lễ
          hội, được ghép từ những loại vỏ hợp với tinh thần ấy.
        </p>
      </div>
      <CollectionShowcase collections={collections} />
    </section>
  );
}

export function CollectionsSkeleton() {
  return (
    <div
      role='status'
      aria-label='Đang tải bộ sưu tập'
      className='container mx-auto grid gap-6 px-6 py-20 md:grid-cols-2 md:py-28 lg:grid-cols-12'
    >
      <Skeleton className='aspect-4/3 rounded-lg md:col-span-2 lg:col-span-7' />
      <div className='grid gap-6 lg:col-span-5'>
        <Skeleton className='aspect-16/9 rounded-lg' />
        <Skeleton className='aspect-16/9 rounded-lg' />
      </div>
    </div>
  );
}
