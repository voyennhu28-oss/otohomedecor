'use client';

import { Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRemoveReviewImage } from '@/features/admin-reviews/hooks/use-admin-reviews';
import type { ImageItem } from '@/features/products/types';
import type { AdminReviewListItem } from '@/features/reviews/types';
import { useRetainedValue } from '@/hooks/use-retained-value';

export type ReviewImageTarget = {
  review: AdminReviewListItem;
  image: ImageItem;
};

export function ReviewImageDialog({
  target: targetProp,
  onClose,
}: {
  target: ReviewImageTarget | null;
  onClose: () => void;
}) {
  const target = useRetainedValue(targetProp);
  const [confirming, setConfirming] = useState(false);
  const remove = useRemoveReviewImage();

  const close = () => {
    setConfirming(false);
    onClose();
  };

  return (
    <Dialog
      open={targetProp !== null}
      onOpenChange={(open) => !open && !remove.isPending && close()}
    >
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-sm p-0 sm:max-w-2xl'>
        <DialogHeader className='shrink-0 border-b px-6 pt-6 pr-14 pb-4'>
          <DialogTitle className='text-2xl'>Ảnh đánh giá</DialogTitle>
          <DialogDescription>
            {target?.review.user?.fullName ?? 'Khách'} ·{' '}
            {target?.review.product?.name ?? 'Sản phẩm đã xóa'}
          </DialogDescription>
        </DialogHeader>
        <div className='flex min-h-0 flex-1 items-center justify-center bg-muted/40 p-4'>
          {target && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={target.image.url}
              alt={target.image.alt ?? 'Ảnh khách gửi kèm đánh giá'}
              className='max-h-[60dvh] w-auto rounded-lg object-contain'
            />
          )}
        </div>
        <DialogFooter className='shrink-0 items-center border-t bg-muted/30 px-6 py-4'>
          {confirming ? (
            <>
              <span className='text-sm sm:mr-auto'>
                Gỡ ảnh này khỏi đánh giá và xóa trên kho ảnh?
              </span>
              <Button
                variant='outline'
                size='sm'
                className='rounded-sm'
                disabled={remove.isPending}
                onClick={() => setConfirming(false)}
              >
                Không
              </Button>
              <Button
                variant='destructive'
                size='sm'
                className='rounded-sm'
                disabled={remove.isPending}
                onClick={() => {
                  if (!target?.image.publicID) return;
                  remove.mutate(
                    { id: target.review.id, publicID: target.image.publicID },
                    {
                      onSuccess: () => {
                        toast.success('Đã gỡ ảnh');
                        close();
                      },
                      onError: (err) => toast.error(err.message),
                    },
                  );
                }}
              >
                {remove.isPending ? 'Đang gỡ…' : 'Gỡ ảnh'}
              </Button>
            </>
          ) : (
            target?.image.publicID && (
              <Button
                variant='ghost'
                size='sm'
                className='rounded-sm text-destructive hover:bg-destructive/10 hover:text-destructive'
                onClick={() => setConfirming(true)}
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.75} />
                Gỡ ảnh không phù hợp
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
