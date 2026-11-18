'use client';

import { Add01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Controller,
  get,
  useFieldArray,
  useFormContext,
  useWatch,
  type FieldError as FormFieldError,
  type FieldValues,
} from 'react-hook-form';

import {
  NumberInput,
  optionalNumber,
  requiredNumber,
} from '@/components/admin/number-input';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

type VariantFieldsProps = {
  prefix?: string;
  idPrefix: string;
  showStock?: boolean;
};

export function VariantFields({
  prefix = '',
  idPrefix,
  showStock = true,
}: VariantFieldsProps) {
  const { register, control, formState } = useFormContext<FieldValues>();
  const path = (name: string) => `${prefix}${name}`;
  const id = (name: string) => `${idPrefix}-${name}`;
  const error = (name: string) =>
    get(formState.errors, path(name)) as FormFieldError | undefined;
  const [price, compareAtPrice] = useWatch({
    control,
    name: [path('price'), path('compareAtPrice')],
  }) as [number, number | null];

  const options = useFieldArray({ control, name: path('options') });

  return (
    <div className='flex flex-col gap-5'>
      <div className='grid gap-4 sm:grid-cols-[1fr_200px]'>
        <Field data-invalid={!!error('name')}>
          <FieldLabel htmlFor={id('name')}>Tên biến thể</FieldLabel>
          <Input
            id={id('name')}
            placeholder='vd: Đèn sò điệp - Size M'
            aria-invalid={!!error('name')}
            {...register(path('name'))}
          />
          <FieldError errors={[error('name')]} />
        </Field>
        <Field data-invalid={!!error('sku')}>
          <FieldLabel htmlFor={id('sku')}>SKU</FieldLabel>
          <Input
            id={id('sku')}
            spellCheck={false}
            placeholder='vd: DEN-SO-DIEP-M'
            className='font-mono text-[13px] uppercase'
            aria-invalid={!!error('sku')}
            {...register(path('sku'))}
          />
          <FieldError errors={[error('sku')]} />
        </Field>
      </div>

      <div
        className={cn(
          'grid gap-4 sm:grid-cols-2',
          showStock && 'lg:grid-cols-3',
        )}
      >
        <Field data-invalid={!!error('price')}>
          <FieldLabel htmlFor={id('price')}>Giá bán</FieldLabel>
          <NumberInput
            id={id('price')}
            min={1}
            step={1000}
            suffix='₫'
            aria-invalid={!!error('price')}
            {...register(path('price'), requiredNumber)}
          />
          {error('price') ? (
            <FieldError errors={[error('price')]} />
          ) : (
            Number.isFinite(price) &&
            price > 0 && <FieldDescription>{formatVND(price)}</FieldDescription>
          )}
        </Field>
        <Field data-invalid={!!error('compareAtPrice')}>
          <FieldLabel htmlFor={id('compareAtPrice')}>
            Giá gạch ngang
            <span className='font-normal text-muted-foreground'>(nếu có)</span>
          </FieldLabel>
          <NumberInput
            id={id('compareAtPrice')}
            min={0}
            step={1000}
            suffix='₫'
            aria-invalid={!!error('compareAtPrice')}
            {...register(path('compareAtPrice'), optionalNumber)}
          />
          {error('compareAtPrice') ? (
            <FieldError errors={[error('compareAtPrice')]} />
          ) : (
            <FieldDescription>
              {compareAtPrice
                ? formatVND(compareAtPrice)
                : 'Giá cũ, phải lớn hơn giá bán.'}
            </FieldDescription>
          )}
        </Field>
        {showStock && (
          <Field data-invalid={!!error('stock')}>
            <FieldLabel htmlFor={id('stock')}>Tồn kho</FieldLabel>
            <NumberInput
              id={id('stock')}
              min={0}
              step={1}
              inputMode='numeric'
              suffix='cái'
              aria-invalid={!!error('stock')}
              {...register(path('stock'), requiredNumber)}
            />
            <FieldError errors={[error('stock')]} />
          </Field>
        )}
      </div>

      <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
        {(
          [
            ['lengthCm', 'Dài'],
            ['widthCm', 'Rộng'],
            ['heightCm', 'Cao'],
          ] as const
        ).map(([name, label]) => (
          <Field key={name} data-invalid={!!error(name)}>
            <FieldLabel htmlFor={id(name)}>{label}</FieldLabel>
            <NumberInput
              id={id(name)}
              min={0}
              step='any'
              suffix='cm'
              aria-invalid={!!error(name)}
              {...register(path(name), optionalNumber)}
            />
            <FieldError errors={[error(name)]} />
          </Field>
        ))}
        <Field data-invalid={!!error('weightKg')}>
          <FieldLabel htmlFor={id('weightKg')}>Khối lượng</FieldLabel>
          <NumberInput
            id={id('weightKg')}
            min={0}
            step='any'
            suffix='kg'
            aria-invalid={!!error('weightKg')}
            {...register(path('weightKg'), requiredNumber)}
          />
          <FieldError errors={[error('weightKg')]} />
        </Field>
      </div>

      <Field>
        <div className='flex items-center justify-between gap-2'>
          <FieldLabel>Thuộc tính</FieldLabel>
          <Button
            type='button'
            variant='ghost'
            size='xs'
            className='rounded-sm'
            disabled={options.fields.length >= 5}
            onClick={() => options.append({ name: '', value: '' })}
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            Thêm thuộc tính
          </Button>
        </div>
        {options.fields.length === 0 ? (
          <FieldDescription>
            vd: Màu = Trắng ngà, Kích thước = M. Thuộc tính tên &quot;Màu&quot;
            được dùng cho bộ lọc màu ở cửa hàng.
          </FieldDescription>
        ) : (
          <div className='flex flex-col gap-2'>
            {options.fields.map((option, index) => {
              const nameError = error(`options.${index}.name`);
              const valueError = error(`options.${index}.value`);
              return (
                <div key={option.id} className='flex items-start gap-2'>
                  <div className='grid flex-1 grid-cols-2 gap-2'>
                    <div>
                      <Input
                        aria-label={`Tên thuộc tính ${index + 1}`}
                        placeholder='Tên, vd: Màu'
                        aria-invalid={!!nameError}
                        {...register(path(`options.${index}.name`))}
                      />
                      <FieldError errors={[nameError]} className='mt-1' />
                    </div>
                    <div>
                      <Input
                        aria-label={`Giá trị thuộc tính ${index + 1}`}
                        placeholder='Giá trị, vd: Trắng ngà'
                        aria-invalid={!!valueError}
                        {...register(path(`options.${index}.value`))}
                      />
                      <FieldError errors={[valueError]} className='mt-1' />
                    </div>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    className='rounded-sm text-muted-foreground'
                    aria-label={`Bỏ thuộc tính ${index + 1}`}
                    onClick={() => options.remove(index)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.75} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Field>

      <Controller
        control={control}
        name={path('isActive')}
        render={({ field }) => (
          <Field orientation='horizontal'>
            <Switch
              id={id('active')}
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
            />
            <FieldContent>
              <FieldLabel htmlFor={id('active')}>Đang bán</FieldLabel>
              <FieldDescription>
                Tắt thì khách không chọn được biến thể này.
              </FieldDescription>
            </FieldContent>
          </Field>
        )}
      />
    </div>
  );
}
