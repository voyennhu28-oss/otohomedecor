import { Skeleton } from '@/components/ui/skeleton';

export function CatalogSkeleton() {
  return (
    <div role='status' aria-label='Đang tải sản phẩm'>
      <div className='container mx-auto grid gap-6 px-6 pt-14 pb-12 md:grid-cols-12 md:items-end md:pt-20 md:pb-16'>
        <div className='flex flex-col gap-5 md:col-span-7'>
          <Skeleton className='h-4 w-24 rounded-sm' />
          <Skeleton className='h-14 w-2/3 rounded-sm' />
          <Skeleton className='h-10 w-1/2 rounded-sm' />
        </div>
        <Skeleton className='h-16 rounded-sm md:col-span-5' />
      </div>
      <div className='container mx-auto px-6 pb-24'>
        <div className='grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] xl:gap-16'>
          <div className='hidden flex-col gap-4 lg:flex'>
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className='h-5 w-3/4 rounded-sm' />
            ))}
          </div>
          <div className='flex flex-col gap-10'>
            <Skeleton className='h-10 w-full rounded-sm' />
            <div className='grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 xl:grid-cols-3'>
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className='flex flex-col gap-4'>
                  <Skeleton className='aspect-square rounded-lg' />
                  <Skeleton className='h-5 w-3/4 rounded-sm' />
                  <Skeleton className='h-4 w-1/3 rounded-sm' />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
