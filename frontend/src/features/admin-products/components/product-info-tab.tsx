'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useUpdateProduct } from '@/features/admin-products/hooks/use-admin-products';
import {
  editProductSchema,
  PRODUCT_FORM_FIELDS,
  toProductFormValues,
  toUpdateProductInput,
  type ProductFormValues,
} from '@/features/admin-products/schemas';
import type { AdminProductDetail } from '@/features/products/types';
import { ApiError } from '@/lib/api-client';
import { setServerErrors } from '@/lib/form-errors';

import { FormActions } from './form-actions';
import {
  ProductBasicSection,
  ProductClassificationSection,
  ProductSalesSection,
  ProductStatusSection,
} from './product-form-sections';

export function ProductInfoTab({ product }: { product: AdminProductDetail }) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(editProductSchema),
    defaultValues: toProductFormValues(product),
  });
  const update = useUpdateProduct();
  const { errors, isDirty } = form.formState;

  const onSubmit = (values: ProductFormValues) => {
    const body = toUpdateProductInput(values, product);
    if (Object.keys(body).length === 0) {
      form.reset(values);
      return;
    }
    update.mutate(
      { id: product.id, body },
      {
        onSuccess: () => {
          toast.success('Đã lưu thông tin sản phẩm');
          form.reset(values);
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
          setServerErrors(form.setError, error, {
            fields: PRODUCT_FORM_FIELDS,
          });
        },
      },
    );
  };

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]'>
          <div className='flex flex-col gap-6'>
            <ProductBasicSection mode='edit' />
            <ProductClassificationSection />
          </div>
          <div className='flex flex-col gap-6'>
            <ProductStatusSection />
            <ProductSalesSection />
          </div>
        </div>
        <FormActions
          pending={update.isPending}
          error={errors.root?.server?.message}
          submitLabel='Lưu thay đổi'
          disabled={!isDirty}
          onCancel={() => form.reset()}
        />
      </form>
    </FormProvider>
  );
}
