'use client';

import {
  Add01Icon,
  ArrowDown01Icon,
  Copy01Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FormProvider,
  get,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
} from 'react-hook-form';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { FormSection } from '@/components/admin/form-section';
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
import { useCreateProduct } from '@/features/admin-products/hooks/use-admin-products';
import {
  createProductSchema,
  emptyVariant,
  PRODUCT_FORM_FIELDS,
  toCreateProductInput,
  toProductFormValues,
  type CreateProductFormValues,
} from '@/features/admin-products/schemas';
import { ApiError } from '@/lib/api-client';
import { setServerErrors } from '@/lib/form-errors';
import { cn } from '@/lib/utils';

import {
  ProductBasicSection,
  ProductClassificationSection,
  ProductSalesSection,
  ProductStatusSection,
} from './product-form-sections';
import { VariantFields } from './variant-fields';

type ProductCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  categoryID?: string;
};

export function ProductCreateDialog({
  open,
  onClose,
  categoryID,
}: ProductCreateDialogProps) {
  const [openCount, setOpenCount] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setOpenCount((count) => count + 1);
      setDirty(false);
    }
  }

  const requestClose = () => {
    if (busy) return;
    if (dirty) setConfirmingClose(true);
    else onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
        <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-sm p-0 sm:max-w-5xl'>
          <CreateForm
            key={openCount}
            categoryID={categoryID}
            onDirtyChange={setDirty}
            onBusyChange={setBusy}
            onCancel={requestClose}
            onCreated={onClose}
          />
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        content={
          confirmingClose
            ? {
                title: 'Bỏ sản phẩm đang nhập?',
                description: 'Thông tin bạn đã nhập sẽ mất.',
                confirmLabel: 'Bỏ sản phẩm',
                cancelLabel: 'Tiếp tục nhập',
                destructive: true,
              }
            : null
        }
        onClose={() => setConfirmingClose(false)}
        onConfirm={() => {
          setConfirmingClose(false);
          onClose();
        }}
      />
    </>
  );
}

function CreateForm({
  categoryID,
  onDirtyChange,
  onBusyChange,
  onCancel,
  onCreated,
}: {
  categoryID?: string;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const form = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      ...toProductFormValues(null, categoryID),
      variants: [emptyVariant()],
    },
  });
  const create = useCreateProduct();
  const { errors, isDirty } = form.formState;
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);
  useEffect(
    () => onBusyChange(create.isPending),
    [create.isPending, onBusyChange],
  );

  const onSubmit = (values: CreateProductFormValues) =>
    create.mutate(toCreateProductInput(values), {
      onSuccess: (product) => {
        onCreated();
        toast.success(`Đã thêm "${product.name}"`, {
          description: 'Thêm ảnh để sản phẩm hiện đẹp ở cửa hàng.',
          action: {
            label: 'Thêm ảnh',
            onClick: () =>
              router.push(`/admin/products/${product.id}?tab=images`),
          },
        });
      },
      onError: (error) => {
        if (
          error instanceof ApiError &&
          error.status === 409 &&
          error.message.startsWith('Slug')
        ) {
          form.setError(
            'slug',
            { message: error.message },
            { shouldFocus: true },
          );
          return;
        }
        setServerErrors(form.setError, error, { fields: PRODUCT_FORM_FIELDS });
      },
    });

  const variantsError = (get(errors, 'variants.root') ??
    get(errors, 'variants')) as { message?: unknown } | undefined;
  const serverError = errors.root?.server?.message;

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit, () => setCollapsed(new Set()))}
        className='flex min-h-0 flex-1 flex-col'
      >
        <DialogHeader className='shrink-0 border-b px-6 pt-6 pr-14 pb-4'>
          <DialogTitle className='text-2xl'>Thêm sản phẩm</DialogTitle>
          <DialogDescription>
            Tạo sản phẩm kèm ít nhất 1 biến thể. Ảnh thêm sau khi tạo xong.
          </DialogDescription>
        </DialogHeader>

        <div className='no-scrollbar min-h-0 flex-1 overflow-y-auto bg-muted/20 px-6 py-5'>
          <div className='grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]'>
            <div className='flex min-w-0 flex-col gap-5'>
              <ProductBasicSection mode='create' />
              <VariantsSection
                control={form.control}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
              />
              {typeof variantsError?.message === 'string' && (
                <FormAlert>{variantsError.message}</FormAlert>
              )}
            </div>
            <div className='flex min-w-0 flex-col gap-5'>
              <ProductStatusSection />
              <ProductClassificationSection />
              <ProductSalesSection />
            </div>
          </div>
        </div>

        <DialogFooter className='shrink-0 items-center border-t px-6 py-4'>
          {serverError && (
            <FormAlert className='sm:mr-auto'>{serverError}</FormAlert>
          )}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='rounded-sm'
            disabled={create.isPending}
            onClick={onCancel}
          >
            Hủy
          </Button>
          <Button
            type='submit'
            size='sm'
            className='rounded-sm'
            disabled={create.isPending || create.isSuccess}
          >
            {create.isPending ? 'Đang lưu…' : 'Lưu sản phẩm'}
          </Button>
        </DialogFooter>
      </form>
    </FormProvider>
  );
}

function VariantsSection({
  control,
  collapsed,
  setCollapsed,
}: {
  control: Control<CreateProductFormValues>;
  collapsed: ReadonlySet<string>;
  setCollapsed: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const variants = useFieldArray({ control, name: 'variants' });
  const values = useWatch({ control, name: 'variants' });

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <FormSection
      title={`Biến thể (${variants.fields.length})`}
      description='Mỗi biến thể có giá, tồn kho, SKU riêng. Khách chọn biến thể trước khi thêm vào giỏ.'
      actions={
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-sm'
          disabled={variants.fields.length >= 50}
          onClick={() => variants.append(emptyVariant())}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          Thêm biến thể
        </Button>
      }
    >
      {variants.fields.map((variant, index) => {
        const value = values?.[index];
        const open = !collapsed.has(variant.id);
        return (
          <div key={variant.id} className='rounded-sm border'>
            <div className='flex items-center gap-2 bg-muted/40 px-3 py-2'>
              <button
                type='button'
                aria-expanded={open}
                onClick={() => toggle(variant.id)}
                className='flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={16}
                  strokeWidth={2}
                  className={cn(
                    'shrink-0 text-muted-foreground transition-transform',
                    !open && '-rotate-90',
                  )}
                />
                <span className='truncate text-sm font-medium'>
                  {value?.name || `Biến thể ${index + 1}`}
                </span>
                {value?.sku && (
                  <span className='truncate font-mono text-xs text-muted-foreground'>
                    {value.sku.toUpperCase()}
                  </span>
                )}
              </button>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className='rounded-sm text-muted-foreground'
                aria-label={`Nhân bản biến thể ${index + 1}`}
                title='Nhân bản'
                disabled={variants.fields.length >= 50}
                onClick={() =>
                  variants.insert(index + 1, {
                    ...(value ?? emptyVariant()),
                    options: (value?.options ?? []).map((option) => ({
                      ...option,
                    })),
                    sku: '',
                  })
                }
              >
                <HugeiconsIcon icon={Copy01Icon} strokeWidth={1.75} />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className='rounded-sm text-muted-foreground'
                aria-label={`Xóa biến thể ${index + 1}`}
                title='Xóa'
                disabled={variants.fields.length <= 1}
                onClick={() => variants.remove(index)}
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.75} />
              </Button>
            </div>
            <div className={cn('p-4', !open && 'hidden')}>
              <VariantFields
                prefix={`variants.${index}.`}
                idPrefix={`variant-${variant.id}`}
              />
            </div>
          </div>
        );
      })}
    </FormSection>
  );
}
