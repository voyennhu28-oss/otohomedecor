'use client';

import { Delete02Icon, ImageUpload01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { NumberInput, requiredNumber } from '@/components/admin/number-input';
import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateCollection,
  useRemoveCollectionImage,
  useUpdateCollection,
  useUploadCollectionImage,
} from '@/features/admin-collections/hooks/use-admin-collections';
import {
  COLLECTION_FORM_FIELDS,
  getCollectionFormSchema,
  toCollectionFormValues,
  toCreateCollectionInput,
  toUpdateCollectionInput,
  type CollectionFormValues,
} from '@/features/admin-collections/schemas';
import type { Collection } from '@/features/collections/types';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { ApiError } from '@/lib/api-client';
import { setServerErrors } from '@/lib/form-errors';
import { ACCEPTED_IMAGE_TYPES, validateImageFiles } from '@/lib/image-files';

export type CollectionFormTarget =
  { mode: 'create' } | { mode: 'edit'; collection: Collection };

export function CollectionFormDialog({
  target: targetProp,
  collections,
  onClose,
}: {
  target: CollectionFormTarget | null;
  collections: Collection[];
  onClose: () => void;
}) {
  const target = useRetainedValue(targetProp);
  const [openCount, setOpenCount] = useState(0);
  const [lastTarget, setLastTarget] = useState(targetProp);
  if (targetProp !== null && targetProp !== lastTarget) {
    setLastTarget(targetProp);
    setOpenCount((count) => count + 1);
  }

  const live =
    target?.mode === 'edit'
      ? (collections.find((item) => item.id === target.collection.id) ??
        target.collection)
      : null;

  return (
    <Dialog
      open={targetProp !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-sm p-0 sm:max-w-xl'>
        {target && (
          <CollectionForm
            key={openCount}
            editing={target.mode === 'edit' ? target.collection : null}
            live={live}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CollectionForm({
  editing,
  live,
  onDone,
}: {
  editing: Collection | null;
  live: Collection | null;
  onDone: () => void;
}) {
  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(getCollectionFormSchema(editing ? 'edit' : 'create')),
    defaultValues: toCollectionFormValues(editing),
  });
  const { errors, isDirty } = form.formState;
  const create = useCreateCollection();
  const update = useUpdateCollection();
  const uploadImage = useUploadCollectionImage();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const pending = create.isPending || update.isPending || uploadImage.isPending;

  const onError = (error: unknown) => {
    if (
      error instanceof ApiError &&
      error.status === 409 &&
      error.message.startsWith('Slug')
    ) {
      form.setError('slug', { message: error.message }, { shouldFocus: true });
      return;
    }
    setServerErrors(form.setError, error, { fields: COLLECTION_FORM_FIELDS });
  };

  const onSubmit = (values: CollectionFormValues) => {
    if (!editing) {
      create.mutate(toCreateCollectionInput(values), {
        onSuccess: (collection) => {
          if (!pendingFile) {
            toast.success(`Đã thêm bộ sưu tập "${collection.name}"`);
            onDone();
            return;
          }
          uploadImage.mutate(
            { id: collection.id, file: pendingFile },
            {
              onSuccess: () =>
                toast.success(`Đã thêm bộ sưu tập "${collection.name}"`),
              onError: (err) =>
                toast.error(
                  `Đã tạo "${collection.name}" nhưng chưa tải được ảnh bìa: ${err.message}`,
                ),
              onSettled: onDone,
            },
          );
        },
        onError,
      });
      return;
    }
    const body = toUpdateCollectionInput(values, editing);
    if (Object.keys(body).length === 0) return onDone();
    update.mutate(
      { id: editing.id, body },
      {
        onSuccess: (collection) => {
          toast.success(`Đã lưu bộ sưu tập "${collection.name}"`);
          onDone();
        },
        onError,
      },
    );
  };

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className='flex min-h-0 flex-1 flex-col'
    >
      <DialogHeader className='shrink-0 border-b px-6 pt-6 pr-14 pb-4'>
        <DialogTitle className='text-2xl'>
          {editing ? 'Sửa bộ sưu tập' : 'Thêm bộ sưu tập'}
        </DialogTitle>
        <DialogDescription>
          {editing
            ? `Đang sửa "${editing.name}".`
            : 'Nhóm sản phẩm theo chủ đề, mùa hoặc dịp đặc biệt.'}
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className='no-scrollbar min-h-0 flex-1 gap-5 overflow-y-auto px-6 py-5'>
        <CoverImageField
          collection={live}
          pendingFile={pendingFile}
          onPendingFileChange={setPendingFile}
        />

        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor='collection-name'>Tên bộ sưu tập</FieldLabel>
          <Input
            id='collection-name'
            autoFocus
            placeholder='vd: Biển mùa hè'
            aria-invalid={!!errors.name}
            {...form.register('name')}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.slug}>
          <FieldLabel htmlFor='collection-slug'>
            Slug
            {!editing && (
              <span className='font-normal text-muted-foreground'>
                (không bắt buộc)
              </span>
            )}
          </FieldLabel>
          <Input
            id='collection-slug'
            spellCheck={false}
            className='font-mono text-[13px]'
            placeholder={editing ? undefined : 'Bỏ trống để tự tạo từ tên'}
            aria-invalid={!!errors.slug}
            {...form.register('slug')}
          />
          {errors.slug ? (
            <FieldError errors={[errors.slug]} />
          ) : (
            <FieldDescription>
              {editing
                ? 'Đổi tên không tự đổi slug. Đổi slug làm link cũ không còn đúng.'
                : 'Đường dẫn trang bộ sưu tập ở cửa hàng.'}
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor='collection-description'>
            Mô tả
            <span className='font-normal text-muted-foreground'>
              (không bắt buộc)
            </span>
          </FieldLabel>
          <Textarea
            id='collection-description'
            rows={3}
            aria-invalid={!!errors.description}
            {...form.register('description')}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <div className='grid gap-5 sm:grid-cols-2'>
          <Field data-invalid={!!errors.startsAt}>
            <FieldLabel htmlFor='collection-starts'>
              Bắt đầu hiển thị
            </FieldLabel>
            <Input
              id='collection-starts'
              type='datetime-local'
              aria-invalid={!!errors.startsAt}
              {...form.register('startsAt')}
            />
            {errors.startsAt ? (
              <FieldError errors={[errors.startsAt]} />
            ) : (
              <FieldDescription>Bỏ trống: hiện ngay.</FieldDescription>
            )}
          </Field>
          <Field data-invalid={!!errors.endsAt}>
            <FieldLabel htmlFor='collection-ends'>Kết thúc</FieldLabel>
            <Input
              id='collection-ends'
              type='datetime-local'
              aria-invalid={!!errors.endsAt}
              {...form.register('endsAt')}
            />
            {errors.endsAt ? (
              <FieldError errors={[errors.endsAt]} />
            ) : (
              <FieldDescription>Bỏ trống: không giới hạn.</FieldDescription>
            )}
          </Field>
        </div>

        <Field data-invalid={!!errors.sortOrder}>
          <FieldLabel htmlFor='collection-sort'>Thứ tự</FieldLabel>
          <NumberInput
            id='collection-sort'
            min={0}
            step={1}
            inputMode='numeric'
            className='sm:max-w-40'
            aria-invalid={!!errors.sortOrder}
            {...form.register('sortOrder', requiredNumber)}
          />
          {errors.sortOrder ? (
            <FieldError errors={[errors.sortOrder]} />
          ) : (
            <FieldDescription>Số nhỏ hiện trước.</FieldDescription>
          )}
        </Field>

        <div className='grid gap-5 sm:grid-cols-2'>
          <Controller
            control={form.control}
            name='isActive'
            render={({ field }) => (
              <Field orientation='horizontal'>
                <Switch
                  id='collection-active'
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                />
                <FieldContent>
                  <FieldLabel htmlFor='collection-active'>Bật</FieldLabel>
                  <FieldDescription>
                    Tắt thì khách không thấy, kể cả trong thời gian hiển thị.
                  </FieldDescription>
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name='isFeatured'
            render={({ field }) => (
              <Field orientation='horizontal'>
                <Switch
                  id='collection-featured'
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                />
                <FieldContent>
                  <FieldLabel htmlFor='collection-featured'>Nổi bật</FieldLabel>
                  <FieldDescription>Ưu tiên hiện ở trang chủ.</FieldDescription>
                </FieldContent>
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      {errors.root?.server && (
        <FormAlert className='mx-6 mb-4 shrink-0'>
          {errors.root.server.message}
        </FormAlert>
      )}

      <DialogFooter className='shrink-0 border-t bg-muted/30 px-6 py-4'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-sm'
          onClick={onDone}
        >
          {editing ? 'Đóng' : 'Hủy'}
        </Button>
        <Button
          type='submit'
          size='sm'
          className='rounded-sm'
          disabled={pending || (!!editing && !isDirty)}
        >
          {pending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm bộ sưu tập'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CoverImageField({
  collection,
  pendingFile,
  onPendingFileChange,
}: {
  collection: Collection | null;
  pendingFile: File | null;
  onPendingFileChange: (file: File | null) => void;
}) {
  const inputID = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const upload = useUploadCollectionImage();
  const remove = useRemoveCollectionImage();
  const previewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile],
  );
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const imageUrl = collection
    ? collection.image?.url
    : (previewUrl ?? undefined);
  const busy = upload.isPending || remove.isPending;

  const pick = (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    const message = validateImageFiles([file], 1);
    setError(message);
    if (message) return;
    if (!collection) {
      onPendingFileChange(file);
      return;
    }
    upload.mutate(
      { id: collection.id, file },
      {
        onSuccess: () => toast.success('Đã đổi ảnh bìa'),
        onError: (err) => setError(err.message),
      },
    );
  };

  const clear = () => {
    setError(null);
    if (!collection) {
      onPendingFileChange(null);
      return;
    }
    remove.mutate(collection.id, {
      onSuccess: () => toast.success('Đã xóa ảnh bìa'),
      onError: (err) => setError(err.message),
    });
  };

  return (
    <Field>
      <FieldLabel htmlFor={inputID}>Ảnh bìa</FieldLabel>
      <div className='flex items-center gap-4'>
        <div className='flex aspect-video w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground'>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt='' className='size-full object-cover' />
          ) : (
            <HugeiconsIcon
              icon={ImageUpload01Icon}
              size={22}
              strokeWidth={1.5}
            />
          )}
        </div>
        <div className='flex flex-col items-start gap-2'>
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='rounded-sm'
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {upload.isPending
                ? 'Đang tải lên…'
                : imageUrl
                  ? 'Đổi ảnh'
                  : 'Chọn ảnh'}
            </Button>
            {imageUrl && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='rounded-sm text-muted-foreground'
                disabled={busy}
                onClick={clear}
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.75} />
                {remove.isPending ? 'Đang xóa…' : 'Xóa ảnh'}
              </Button>
            )}
          </div>
          <FieldDescription>
            {collection
              ? 'Đổi / xóa ảnh có tác dụng ngay. JPG, PNG, WEBP, tối đa 5MB.'
              : 'Ảnh được tải lên sau khi tạo bộ sưu tập. JPG, PNG, WEBP, tối đa 5MB.'}
          </FieldDescription>
        </div>
        <input
          ref={inputRef}
          id={inputID}
          type='file'
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className='sr-only'
          onChange={(event) => pick(event.target.files?.[0])}
        />
      </div>
      {error && <FormAlert>{error}</FormAlert>}
    </Field>
  );
}
