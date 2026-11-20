import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DataTableSkeleton } from '@/components/admin/data-table-state';
import { ReviewsManager } from '@/features/admin-reviews/components/reviews-manager';

export const instant = false;

export const metadata: Metadata = { title: 'Đánh giá' };

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<DataTableSkeleton label='Đang tải đánh giá' />}>
      <ReviewsManager />
    </Suspense>
  );
}
