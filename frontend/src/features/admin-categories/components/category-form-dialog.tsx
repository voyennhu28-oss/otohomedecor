'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateCategory,
  useUpdateCategory,
} from '@/features/admin-categories/hooks/use-admin-categories';
import {
  CATEGORY_FORM_FIELDS,
  getCategoryFormSchema,
  toCreateInput,
  toFormValues,
  toUpdateInput,
  type CategoryFormValues,
} from '@/features/admin-categories/schemas';
import {
  collectSubtreeIds,
  flattenTree,
} from '@/features/admin-categories/tree';
import { FormAlert } from '@/components/form-alert';
import type { AdminCategoryNode } from '@/features/categories/types';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { setServerErrors } from '@/lib/form-errors';

export type CategoryFormTarget =
  | { mode: 'create'; parentID?: string | null }
  | { mode: 'edit'; category: AdminCategoryNode };

type CategoryFormDialogProps = {
  target: CategoryFormTarget | null;
  tree: AdminCategoryNode[];
  onClose: () => void;
};

export function CategoryFormDialog({
  target: targetProp,
  tree,
  onClose,
}: CategoryFormDialogProps) {
  const target = useRetainedValue(targetProp);
  const [openCount, setOpenCount] = useState(0);
  const [lastTarget, setLastTarget] = useState(targetProp);
  if (targetProp !== null && targetProp !== lastTarget) {
    setLastTarget(targetProp);
    setOpenCount((count) => count + 1);
  }

  return (
    <Dialog
      open={targetProp !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-sm p-0 sm:max-w-xl'>
        {target && (
          <CategoryForm
            key={openCount}
            target={target}
            tree={tree}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  target,
  tree,
  onDone,
}: {
  target: CategoryFormTarget;
  tree: AdminCategoryNode[];
  onDone: () => void;
}) {
  const editing = target.mode === 'edit' ? target.category : null;
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(getCategoryFormSchema(target.mode)),
    defaultValues: toFormValues(
      editing,
      target.mode === 'create' ? target.parentID : undefined,
    ),
  });
  const { errors, isDirty } = form.formState;
  const imageUrl = useWatch({ control: form.control, name: 'imageUrl' });

  const parentOptions = useMemo(() => {
    const excluded = editing ? collectSubtreeIds(editing) : new Set<string>();
    return flattenTree(tree).filter(({ node }) => !excluded.has(node.id));
  }, [tree, editing]);

  const create = useCreateCategory();
  const update = useUpdateCategory();
  const pending = create.isPending || update.isPending;

  const onError = (error: unknown) =>
    setServerErrors(form.setError, error, {
      fields: CATEGORY_FORM_FIELDS,
      conflictField: 'slug',
    });

  const onSubmit = (values: CategoryFormValues) => {
    if (!editing) {
      create.mutate(toCreateInput(values), {
        onSuccess: (category) => {
          toast.success(`Đã thêm danh mục "${category.name}"`);
          onDone();
        },
        onError,
      });
      return;
    }
    const body = toUpdateInput(values, editing);
    if (Object.keys(body).length === 0) return onDone();
    update.mutate(
      { id: editing.id, body },
      {
        onSuccess: (category) => {
          toast.success(`Đã lưu danh mục "${category.name}"`);
          onDone();
        },
        onError,
      },
    );
  };

  const previewUrl = /^https?:\/\/\S+$/i.test(imageUrl.trim())
    ? imageUrl.trim()
    : null;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className='flex min-h-0 flex-1 flex-col'
    >
      <DialogHeader className='shrink-0 border-b px-6 pt-6 pr-14 pb-4'>
        <DialogTitle className='text-2xl'>
          {editing ? 'Sửa danh mục' : 'Thêm danh mục'}
        </DialogTitle>
        <DialogDescription>
          {editing
            ? `Đang sửa "${editing.name}".`
            : 'Danh mục giúp khách lọc sản phẩm ở cửa hàng.'}
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className='no-scrollbar min-h-0 flex-1 gap-5 overflow-y-auto px-6 py-5'>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor='category-name'>Tên danh mục</FieldLabel>
          <Input
            id='category-name'
            autoFocus
            placeholder='vd: Đèn treo'
            aria-invalid={!!errors.name}
            {...form.register('name')}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.slug}>
          <FieldLabel htmlFor='category-slug'>
            Slug
            {!editing && (
              <span className='font-normal text-muted-foreground'>
                (không bắt buộc)
              </span>
            )}
          </FieldLabel>
          <Input
            id='category-slug'
            placeholder={editing ? undefined : 'Bỏ trống để tự tạo từ tên'}
            spellCheck={false}
            className='font-mono text-[13px]'
            aria-invalid={!!errors.slug}
            aria-describedby='category-slug-description'
            {...form.register('slug')}
          />
          {errors.slug ? (
            <FieldError errors={[errors.slug]} />
          ) : (
            <FieldDescription id='category-slug-description'>
              {editing
                ? 'Đường dẫn danh mục trên cửa hàng. Đổi slug làm link cũ không còn đúng.'
                : 'Đường dẫn danh mục trên cửa hàng, vd: den-treo.'}
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={!!errors.parentID}>
          <FieldLabel htmlFor='category-parent'>Danh mục cha</FieldLabel>
          <NativeSelect
            id='category-parent'
            className='w-full'
            aria-invalid={!!errors.parentID}
            {...form.register('parentID')}
          >
            <NativeSelectOption value=''>
              Không có (danh mục gốc)
            </NativeSelectOption>
            {parentOptions.map(({ node, depth }) => (
              <NativeSelectOption key={node.id} value={node.id}>
                {`${'    '.repeat(depth)}${depth > 0 ? '└ ' : ''}${node.name}${node.isActive ? '' : ' (đang ẩn)'}`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError errors={[errors.parentID]} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor='category-description'>
            Mô tả
            <span className='font-normal text-muted-foreground'>
              (không bắt buộc)
            </span>
          </FieldLabel>
          <Textarea
            id='category-description'
            rows={3}
            aria-invalid={!!errors.description}
            {...form.register('description')}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Field data-invalid={!!errors.imageUrl}>
          <FieldLabel htmlFor='category-image'>
            Ảnh đại diện (URL)
            <span className='font-normal text-muted-foreground'>
              (không bắt buộc)
            </span>
          </FieldLabel>
          <div className='flex items-start gap-3'>
            <div className='flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-muted'>
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=''
                  className='size-full object-cover'
                />
              )}
            </div>
            <Input
              id='category-image'
              type='url'
              inputMode='url'
              placeholder='https://...'
              aria-invalid={!!errors.imageUrl}
              {...form.register('imageUrl')}
            />
          </div>
          <FieldError errors={[errors.imageUrl]} />
        </Field>

        <div className='grid gap-5 sm:grid-cols-2'>
          <Field data-invalid={!!errors.sortOrder}>
            <FieldLabel htmlFor='category-sort'>Thứ tự</FieldLabel>
            <Input
              id='category-sort'
              type='number'
              min={0}
              step={1}
              inputMode='numeric'
              aria-invalid={!!errors.sortOrder}
              aria-describedby='category-sort-description'
              {...form.register('sortOrder', { valueAsNumber: true })}
            />
            {errors.sortOrder ? (
              <FieldError errors={[errors.sortOrder]} />
            ) : (
              <FieldDescription id='category-sort-description'>
                Số nhỏ hiện trước.
              </FieldDescription>
            )}
          </Field>

          <Controller
            control={form.control}
            name='isActive'
            render={({ field }) => (
              <Field orientation='horizontal' className='sm:pt-6'>
                <Switch
                  id='category-active'
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
                <FieldContent>
                  <FieldLabel htmlFor='category-active'>
                    Hiển thị ở cửa hàng
                  </FieldLabel>
                  <FieldDescription>
                    Tắt thì cả danh mục con cũng bị ẩn.
                  </FieldDescription>
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
          Hủy
        </Button>
        <Button
          type='submit'
          size='sm'
          className='rounded-sm'
          disabled={pending || (!!editing && !isDirty)}
        >
          {pending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm danh mục'}
        </Button>
      </DialogFooter>
    </form>
  );
}
