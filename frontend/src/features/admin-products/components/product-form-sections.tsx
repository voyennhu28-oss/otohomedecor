'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { FormSection } from '@/components/admin/form-section';
import { NumberInput, requiredNumber } from '@/components/admin/number-input';
import { TagsInput } from '@/components/admin/tags-input';
import { ToggleChips } from '@/components/admin/toggle-chips';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
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
  MATERIALS,
  PRODUCT_STATUSES,
  ROOMS,
  STYLES,
} from '@/constants/catalog';
import { useAdminCategories } from '@/features/admin-categories/hooks/use-admin-categories';
import { flattenTree } from '@/features/admin-categories/tree';
import {
  COLLECTION_STATES,
  getCollectionState,
} from '@/features/admin-collections/filters';
import { useAdminCollections } from '@/features/admin-collections/hooks/use-admin-collections';
import type { ProductFormValues } from '@/features/admin-products/schemas';
import { formatVND } from '@/lib/format';

const selectClass = 'w-full [&_select]:rounded-sm';

export function ProductBasicSection({ mode }: { mode: 'create' | 'edit' }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductFormValues>();

  return (
    <FormSection title='Thông tin cơ bản'>
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor='product-name'>Tên sản phẩm</FieldLabel>
        <Input
          id='product-name'
          placeholder='vd: Đèn vỏ sò điệp treo trần'
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        <FieldError errors={[errors.name]} />
      </Field>

      <Field data-invalid={!!errors.slug}>
        <FieldLabel htmlFor='product-slug'>
          Slug
          {mode === 'create' && (
            <span className='font-normal text-muted-foreground'>
              (không bắt buộc)
            </span>
          )}
        </FieldLabel>
        <Input
          id='product-slug'
          spellCheck={false}
          className='font-mono text-[13px]'
          placeholder={
            mode === 'create' ? 'Bỏ trống để tự tạo từ tên' : undefined
          }
          aria-invalid={!!errors.slug}
          aria-describedby='product-slug-description'
          {...register('slug')}
        />
        {errors.slug ? (
          <FieldError errors={[errors.slug]} />
        ) : (
          <FieldDescription id='product-slug-description'>
            {mode === 'create'
              ? 'Đường dẫn trang sản phẩm: /products/<slug>.'
              : 'Đổi tên không tự đổi slug. Đổi slug làm link cũ không còn đúng.'}
          </FieldDescription>
        )}
      </Field>

      <Field data-invalid={!!errors.shortDescription}>
        <FieldLabel htmlFor='product-short'>
          Mô tả ngắn
          <span className='font-normal text-muted-foreground'>
            (không bắt buộc)
          </span>
        </FieldLabel>
        <Textarea
          id='product-short'
          rows={2}
          placeholder='Một câu hiện dưới tên sản phẩm'
          aria-invalid={!!errors.shortDescription}
          {...register('shortDescription')}
        />
        <FieldError errors={[errors.shortDescription]} />
      </Field>

      <Field data-invalid={!!errors.description}>
        <FieldLabel htmlFor='product-description'>
          Mô tả chi tiết
          <span className='font-normal text-muted-foreground'>
            (không bắt buộc)
          </span>
        </FieldLabel>
        <Textarea
          id='product-description'
          rows={8}
          aria-invalid={!!errors.description}
          aria-describedby='product-description-hint'
          {...register('description')}
        />
        {errors.description ? (
          <FieldError errors={[errors.description]} />
        ) : (
          <FieldDescription id='product-description-hint'>
            Nhận HTML hoặc markdown, tối đa 20.000 ký tự.
          </FieldDescription>
        )}
      </Field>
    </FormSection>
  );
}

export function ProductStatusSection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProductFormValues>();

  return (
    <FormSection title='Trạng thái'>
      <Field data-invalid={!!errors.status}>
        <FieldLabel htmlFor='product-status' className='sr-only'>
          Trạng thái
        </FieldLabel>
        <NativeSelect
          id='product-status'
          className={selectClass}
          aria-invalid={!!errors.status}
          {...register('status')}
        >
          {Object.entries(PRODUCT_STATUSES).map(([key, label]) => (
            <NativeSelectOption key={key} value={key}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {errors.status ? (
          <FieldError errors={[errors.status]} />
        ) : (
          <FieldDescription>
            Chỉ sản phẩm &quot;Đang bán&quot; hiện ở cửa hàng.
          </FieldDescription>
        )}
      </Field>

      <Controller
        control={control}
        name='isFeatured'
        render={({ field }) => (
          <Field orientation='horizontal'>
            <Switch
              id='product-featured'
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
            />
            <FieldContent>
              <FieldLabel htmlFor='product-featured'>
                Sản phẩm nổi bật
              </FieldLabel>
              <FieldDescription>Hiện ở mục nổi bật trang chủ.</FieldDescription>
            </FieldContent>
          </Field>
        )}
      />
    </FormSection>
  );
}

export function ProductClassificationSection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProductFormValues>();
  const { data: tree, isPending } = useAdminCategories();
  const categoryOptions = useMemo(() => flattenTree(tree ?? []), [tree]);
  const { data: collections, isPending: collectionsPending } =
    useAdminCollections();
  const collectionOptions = useMemo(
    () =>
      Object.fromEntries(
        (collections ?? []).map((collection) => {
          const state = getCollectionState(collection);
          return [
            collection.id,
            state === 'live'
              ? collection.name
              : `${collection.name} (${COLLECTION_STATES[state].toLowerCase()})`,
          ];
        }),
      ) as Record<string, string>,
    [collections],
  );

  return (
    <FormSection title='Phân loại' description='Dùng cho bộ lọc ở cửa hàng.'>
      <Field data-invalid={!!errors.categoryID}>
        <FieldLabel htmlFor='product-category'>Danh mục</FieldLabel>
        <NativeSelect
          id='product-category'
          className={selectClass}
          disabled={isPending}
          aria-invalid={!!errors.categoryID}
          {...register('categoryID')}
        >
          <NativeSelectOption value=''>
            {isPending ? 'Đang tải danh mục…' : 'Chọn danh mục'}
          </NativeSelectOption>
          {categoryOptions.map(({ node, depth }) => (
            <NativeSelectOption key={node.id} value={node.id}>
              {`${'    '.repeat(depth)}${depth > 0 ? '└ ' : ''}${node.name}${node.isActive ? '' : ' (đang ẩn)'}`}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldError errors={[errors.categoryID]} />
      </Field>

      <Controller
        control={control}
        name='collectionIDs'
        render={({ field, fieldState }) => (
          <Field data-invalid={!!fieldState.error}>
            <FieldLabel htmlFor='product-collections'>Bộ sưu tập</FieldLabel>
            {collectionsPending ? (
              <FieldDescription>Đang tải bộ sưu tập…</FieldDescription>
            ) : Object.keys(collectionOptions).length === 0 ? (
              <FieldDescription>
                Chưa có bộ sưu tập.{' '}
                <Link
                  href='/admin/collections'
                  className='underline underline-offset-4 hover:text-foreground'
                >
                  Tạo bộ sưu tập
                </Link>
              </FieldDescription>
            ) : (
              <ToggleChips
                id='product-collections'
                label='Bộ sưu tập'
                options={collectionOptions}
                value={field.value}
                onChange={field.onChange}
              />
            )}
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={control}
        name='materials'
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor='product-materials'>Chất liệu</FieldLabel>
            <ToggleChips
              id='product-materials'
              label='Chất liệu'
              options={MATERIALS}
              value={field.value}
              onChange={field.onChange}
            />
          </Field>
        )}
      />
      <Controller
        control={control}
        name='styles'
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor='product-styles'>Phong cách</FieldLabel>
            <ToggleChips
              id='product-styles'
              label='Phong cách'
              options={STYLES}
              value={field.value}
              onChange={field.onChange}
            />
          </Field>
        )}
      />
      <Controller
        control={control}
        name='rooms'
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor='product-rooms'>Không gian</FieldLabel>
            <ToggleChips
              id='product-rooms'
              label='Không gian'
              options={ROOMS}
              value={field.value}
              onChange={field.onChange}
            />
          </Field>
        )}
      />
      <Controller
        control={control}
        name='tags'
        render={({ field, fieldState }) => (
          <Field data-invalid={!!fieldState.error}>
            <FieldLabel htmlFor='product-tags'>Tag</FieldLabel>
            <TagsInput
              id='product-tags'
              value={field.value}
              onChange={field.onChange}
              invalid={!!fieldState.error}
              describedBy='product-tags-hint'
              placeholder='Nhập rồi bấm Enter'
            />
            {fieldState.error ? (
              <FieldError errors={[fieldState.error]} />
            ) : (
              <FieldDescription id='product-tags-hint'>
                Tối đa 20 tag, mỗi tag 30 ký tự.
              </FieldDescription>
            )}
          </Field>
        )}
      />
    </FormSection>
  );
}

export function ProductSalesSection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProductFormValues>();
  const [allowBackorder, requiresAssembly, assemblyFee] = useWatch({
    control,
    name: ['allowBackorder', 'requiresAssembly', 'assemblyFee'],
  });

  return (
    <FormSection title='Bán hàng'>
      <Controller
        control={control}
        name='allowBackorder'
        render={({ field }) => (
          <Field orientation='horizontal'>
            <Switch
              id='product-backorder'
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
            />
            <FieldContent>
              <FieldLabel htmlFor='product-backorder'>Hàng đặt làm</FieldLabel>
              <FieldDescription>
                Cho khách đặt cả khi hết hàng.
              </FieldDescription>
            </FieldContent>
          </Field>
        )}
      />
      {allowBackorder && (
        <Field data-invalid={!!errors.leadTimeDays}>
          <FieldLabel htmlFor='product-lead-time'>Thời gian làm</FieldLabel>
          <NumberInput
            id='product-lead-time'
            min={0}
            max={365}
            step={1}
            suffix='ngày'
            aria-invalid={!!errors.leadTimeDays}
            {...register('leadTimeDays', requiredNumber)}
          />
          <FieldError errors={[errors.leadTimeDays]} />
        </Field>
      )}

      <Controller
        control={control}
        name='requiresAssembly'
        render={({ field }) => (
          <Field orientation='horizontal'>
            <Switch
              id='product-assembly'
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
            />
            <FieldContent>
              <FieldLabel htmlFor='product-assembly'>Cần lắp đặt</FieldLabel>
              <FieldDescription>
                Tính thêm phí lắp đặt mỗi sản phẩm.
              </FieldDescription>
            </FieldContent>
          </Field>
        )}
      />
      {requiresAssembly && (
        <Field data-invalid={!!errors.assemblyFee}>
          <FieldLabel htmlFor='product-assembly-fee'>Phí lắp đặt</FieldLabel>
          <NumberInput
            id='product-assembly-fee'
            min={0}
            step={1000}
            suffix='₫'
            aria-invalid={!!errors.assemblyFee}
            {...register('assemblyFee', requiredNumber)}
          />
          {errors.assemblyFee ? (
            <FieldError errors={[errors.assemblyFee]} />
          ) : (
            Number.isFinite(assemblyFee) &&
            assemblyFee > 0 && (
              <FieldDescription>{formatVND(assemblyFee)}</FieldDescription>
            )
          )}
        </Field>
      )}

      <Field data-invalid={!!errors.warrantyMonths}>
        <FieldLabel htmlFor='product-warranty'>Bảo hành</FieldLabel>
        <NumberInput
          id='product-warranty'
          min={0}
          max={120}
          step={1}
          suffix='tháng'
          aria-invalid={!!errors.warrantyMonths}
          {...register('warrantyMonths', requiredNumber)}
        />
        <FieldError errors={[errors.warrantyMonths]} />
      </Field>
    </FormSection>
  );
}
