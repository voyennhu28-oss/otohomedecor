'use client';

import { Delete02Icon, ImageUpload01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useId, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  ConfirmDialog,
  type ConfirmContent,
} from '@/components/admin/confirm-dialog';
import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDeleteImage,
  useUploadImages,
} from '@/features/admin-products/hooks/use-admin-products';
import type { AdminProductDetail, ImageItem } from '@/features/products/types';
import { ACCEPTED_IMAGE_TYPES, validateImageFiles } from '@/lib/image-files';
import { cn } from '@/lib/utils';

const MAX_FILES = 10;

export function ProductImagesTab({ product }: { product: AdminProductDetail }) {
  const inputID = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ImageItem | null>(null);
  const upload = useUploadImages(product.id);
  const remove = useDeleteImage(product.id);
  const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (inputRef.current) inputRef.current.value = '';
    if (files.length === 0) return;
    const message = validateImageFiles(files, MAX_FILES);
    setError(message);
    if (message) return;
    upload.mutate(files, {
      onSuccess: () => toast.success(`Đã tải lên ${files.length} ảnh`),
      onError: (err) => setError(err.message),
    });
  };

  const confirmContent: ConfirmContent | null = deleting && {
    title: 'Xóa ảnh?',
    description:
      'Ảnh sẽ bị gỡ khỏi sản phẩm và xóa trên kho ảnh. Không hoàn tác được.',
    confirmLabel: 'Xóa ảnh',
    destructive: true,
  };

  return (
    <div className='flex flex-col gap-5'>
      <label
        htmlFor={inputID}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!upload.isPending) handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-sm border border-dashed px-6 py-10 text-center transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring',
          dragging ? 'border-foreground/40 bg-muted' : 'hover:bg-muted/50',
          upload.isPending && 'pointer-events-none opacity-60',
        )}
      >
        <span className='flex size-11 items-center justify-center rounded-sm bg-muted text-muted-foreground'>
          <HugeiconsIcon icon={ImageUpload01Icon} size={22} strokeWidth={1.5} />
        </span>
        <span className='text-sm font-medium'>
          {upload.isPending
            ? 'Đang tải ảnh lên…'
            : 'Kéo thả ảnh vào đây hoặc bấm để chọn'}
        </span>
        <span className='text-xs text-muted-foreground'>
          JPG, PNG, WEBP · tối đa 5MB mỗi ảnh · {MAX_FILES} ảnh mỗi lần
        </span>
        <input
          ref={inputRef}
          id={inputID}
          type='file'
          multiple
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className='sr-only'
          disabled={upload.isPending}
          onChange={(event) => handleFiles(event.target.files)}
        />
      </label>

      {error && <FormAlert>{error}</FormAlert>}

      {images.length === 0 && !upload.isPending ? (
        <p className='text-sm text-muted-foreground'>
          Chưa có ảnh. Ảnh đầu tiên là ảnh đại diện ở danh sách sản phẩm.
        </p>
      ) : (
        <>
          <ul className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
            {images.map((image, index) => (
              <li
                key={image.publicID ?? image.url}
                className='group relative overflow-hidden rounded-lg border bg-muted'
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.alt ?? `Ảnh ${index + 1} của ${product.name}`}
                  loading='lazy'
                  className='aspect-square w-full object-cover'
                />
                {index === 0 && (
                  <span className='absolute top-2 left-2 rounded-sm bg-background/90 px-1.5 py-0.5 text-[11px] font-medium'>
                    Ảnh đại diện
                  </span>
                )}
                {image.publicID && (
                  <Button
                    variant='secondary'
                    size='icon-sm'
                    className='absolute top-2 right-2 rounded-sm bg-background/90 opacity-100 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100'
                    aria-label={`Xóa ảnh ${index + 1}`}
                    onClick={() => setDeleting(image)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.75} />
                  </Button>
                )}
              </li>
            ))}
            {upload.isPending &&
              Array.from({ length: upload.variables?.length ?? 1 }, (_, i) => (
                <li key={`uploading-${i}`}>
                  <Skeleton className='aspect-square w-full rounded-lg' />
                </li>
              ))}
          </ul>
          <p className='text-xs text-muted-foreground'>
            Ảnh xếp theo thứ tự tải lên, ảnh đầu là ảnh đại diện. Muốn đổi ảnh
            đại diện: xóa rồi tải lại theo thứ tự mong muốn.
          </p>
        </>
      )}

      <ConfirmDialog
        content={confirmContent}
        pending={remove.isPending}
        pendingLabel='Đang xóa…'
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting?.publicID) return;
          remove.mutate(deleting.publicID, {
            onSuccess: () => {
              toast.success('Đã xóa ảnh');
              setDeleting(null);
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </div>
  );
}
