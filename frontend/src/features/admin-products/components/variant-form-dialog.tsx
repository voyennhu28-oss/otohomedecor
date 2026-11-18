'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';

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
  useCreateVariant,
  useUpdateVariant,
} from '@/features/admin-products/hooks/use-admin-products';
import {
  emptyVariant,
  toUpdateVariantInput,
  toVariantFormValues,
  toVariantInput,
  VARIANT_FORM_FIELDS,
  variantFormSchema,
  type VariantFormValues,
} from '@/features/admin-products/schemas';
import type { ProductVariant } from '@/features/products/types';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { ApiError } from '@/lib/api-client';
import { setServerErrors } from '@/lib/form-errors';

import { VariantFields } from './variant-fields';

export type VariantFormTarget =
  | { mode: 'create'; copyFrom?: ProductVariant }
  | { mode: 'edit'; variant: ProductVariant };

type VariantFormDialogProps = {
  productID: string;
  target: VariantFormTarget | null;
  onClose: () => void;
};

export function VariantFormDialog({
  productID,
  target: targetProp,
  onClose,
}: VariantFormDialogProps) {
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
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-sm p-0 sm:max-w-2xl'>
        {target && (
          <VariantForm
            key={openCount}
            productID={productID}
            target={target}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function VariantForm({
  productID,
  target,
  onDone,
}: {
  productID: string;
  target: VariantFormTarget;
  onDone: () => void;
}) {
  const editing = target.mode === 'edit' ? target.variant : null;
  const source = target.mode === 'create' ? target.copyFrom : undefined;
  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: editing
      ? toVariantFormValues(editing)
      : source
        ? { ...toVariantFormValues(source), sku: '', stock: 0 }
        : emptyVariant(),
  });
  const create = useCreateVariant(productID);
  const update = useUpdateVariant(productID);
  const pending = create.isPending || update.isPending;
  const { errors, isDirty } = form.formState;

  const onError = (error: unknown) => {
    if (
      error instanceof ApiError &&
      error.status === 409 &&
      error.message.startsWith('SKU')
    ) {
      form.setError('sku', { message: error.message }, { shouldFocus: true });
      return;
    }
    setServerErrors(form.setError, error, { fields: VARIANT_FORM_FIELDS });
  };

  const onSubmit = (values: VariantFormValues) => {
    if (!editing) {
      create.mutate(toVariantInput(values), {
        onSuccess: (variant) => {
          toast.success(`Đã thêm biến thể "${variant.name}"`);
          onDone();
        },
        onError,
      });
      return;
    }
    const body = toUpdateVariantInput(values, editing);
    if (Object.keys(body).length === 0) return onDone();
    update.mutate(
      { variantID: editing.id, body },
      {
        onSuccess: (variant) => {
          toast.success(`Đã lưu biến thể "${variant.name}"`);
          onDone();
        },
        onError,
      },
    );
  };

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className='flex min-h-0 flex-1 flex-col'
      >
        <DialogHeader className='shrink-0 border-b px-6 pt-6 pr-14 pb-4'>
          <DialogTitle className='text-2xl'>
            {editing ? 'Sửa biến thể' : 'Thêm biến thể'}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? 'Tồn kho đổi ở nút "Điều chỉnh tồn kho" trong bảng.'
              : source
                ? `Sao chép từ "${source.name}". Nhập SKU mới.`
                : 'Giá, tồn kho và SKU riêng cho biến thể này.'}
          </DialogDescription>
        </DialogHeader>

        <div className='no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5'>
          <VariantFields idPrefix='variant-dialog' showStock={!editing} />
        </div>

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
            {pending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm biến thể'}
          </Button>
        </DialogFooter>
      </form>
    </FormProvider>
  );
}
