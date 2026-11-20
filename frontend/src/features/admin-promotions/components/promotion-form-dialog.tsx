'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import {
  NumberInput,
  optionalNumber,
  requiredNumber,
} from '@/components/admin/number-input';
import { SegmentedControl } from '@/components/admin/segmented-control';
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
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreatePromotion,
  useUpdatePromotion,
} from '@/features/admin-promotions/hooks/use-admin-promotions';
import { computeDiscount } from '@/features/admin-promotions/promotion-rules';
import {
  getPromotionFormSchema,
  PROMOTION_FORM_FIELDS,
  toCreatePromotionInput,
  toPromotionFormValues,
  toUpdatePromotionInput,
  type PromotionFormValues,
} from '@/features/admin-promotions/schemas';
import { PROMOTION_TYPES, type Promotion } from '@/features/promotions/types';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { ApiError } from '@/lib/api-client';
import { setServerErrors } from '@/lib/form-errors';
import { formatVND } from '@/lib/format';

export type PromotionFormTarget =
  { mode: 'create' } | { mode: 'edit'; promotion: Promotion };

const SAMPLE_SHIPPING_FEE = 30_000;

export function PromotionFormDialog({
  target: targetProp,
  onClose,
}: {
  target: PromotionFormTarget | null;
  onClose: () => void;
}) {
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
          <PromotionForm
            key={openCount}
            editing={target.mode === 'edit' ? target.promotion : null}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PromotionForm({
  editing,
  onDone,
}: {
  editing: Promotion | null;
  onDone: () => void;
}) {
  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(
      getPromotionFormSchema(editing ? 'edit' : 'create', editing?.usedCount),
    ),
    defaultValues: toPromotionFormValues(editing),
  });
  const { errors, isDirty } = form.formState;
  const create = useCreatePromotion();
  const update = useUpdatePromotion();
  const pending = create.isPending || update.isPending;
  const [type, value, maxDiscount, minOrderValue] = useWatch({
    control: form.control,
    name: ['type', 'value', 'maxDiscount', 'minOrderValue'],
  });

  const sampleSubtotal = Math.max(
    Number.isFinite(minOrderValue) ? minOrderValue : 0,
    1_000_000,
  );
  const sampleDiscount =
    type === 'free_shipping' || (value !== null && value > 0)
      ? computeDiscount(
          { type, value: value ?? 0, maxDiscount },
          sampleSubtotal,
          SAMPLE_SHIPPING_FEE,
        )
      : null;

  const onError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 409) {
      form.setError('code', { message: error.message }, { shouldFocus: true });
      return;
    }
    setServerErrors(form.setError, error, { fields: PROMOTION_FORM_FIELDS });
  };

  const onSubmit = (values: PromotionFormValues) => {
    if (!editing) {
      create.mutate(toCreatePromotionInput(values), {
        onSuccess: (promotion) => {
          toast.success(`Đã tạo mã ${promotion.code}`);
          onDone();
        },
        onError,
      });
      return;
    }
    const body = toUpdatePromotionInput(values, editing);
    if (Object.keys(body).length === 0) return onDone();
    update.mutate(
      { id: editing.id, body },
      {
        onSuccess: (promotion) => {
          toast.success(`Đã lưu mã ${promotion.code}`);
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
          {editing ? `Sửa mã ${editing.code}` : 'Tạo mã giảm giá'}
        </DialogTitle>
        <DialogDescription>
          {editing
            ? `Đã dùng ${editing.usedCount} lượt. Khách nhập mã ở bước thanh toán.`
            : 'Khách nhập mã ở bước thanh toán để được giảm.'}
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className='no-scrollbar min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-5'>
        <div className='grid gap-5 sm:grid-cols-[200px_1fr]'>
          <Field data-invalid={!!errors.code}>
            <FieldLabel htmlFor='promotion-code'>Mã</FieldLabel>
            <Input
              id='promotion-code'
              autoFocus={!editing}
              spellCheck={false}
              autoCapitalize='characters'
              placeholder='vd: TET2027'
              className='font-mono uppercase'
              aria-invalid={!!errors.code}
              {...form.register('code')}
            />
            <FieldError errors={[errors.code]} />
          </Field>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor='promotion-name'>Tên chương trình</FieldLabel>
            <Input
              id='promotion-name'
              placeholder='vd: Mừng Tết, giảm 10%'
              aria-invalid={!!errors.name}
              {...form.register('name')}
            />
            <FieldError errors={[errors.name]} />
          </Field>
        </div>
        {editing && editing.usedCount > 0 && (
          <p className='-mt-3 text-xs text-muted-foreground'>
            Đổi mã thì khách đang giữ mã cũ sẽ không dùng được nữa.
          </p>
        )}

        <FieldSet className='gap-4'>
          <FieldLegend variant='label'>Mức giảm</FieldLegend>
          <Controller
            control={form.control}
            name='type'
            render={({ field }) => (
              <SegmentedControl
                label='Loại mã'
                value={field.value}
                onChange={field.onChange}
                options={PROMOTION_TYPES}
              />
            )}
          />
          {type !== 'free_shipping' && (
            <div className='grid gap-5 sm:grid-cols-2'>
              <Field data-invalid={!!errors.value}>
                <FieldLabel htmlFor='promotion-value'>
                  {type === 'percentage' ? 'Phần trăm giảm' : 'Số tiền giảm'}
                </FieldLabel>
                <NumberInput
                  id='promotion-value'
                  min={1}
                  max={type === 'percentage' ? 100 : undefined}
                  step={type === 'percentage' ? 1 : 1000}
                  suffix={type === 'percentage' ? '%' : '₫'}
                  aria-invalid={!!errors.value}
                  {...form.register('value', optionalNumber)}
                />
                <FieldError errors={[errors.value]} />
              </Field>
              {type === 'percentage' && (
                <Field data-invalid={!!errors.maxDiscount}>
                  <FieldLabel htmlFor='promotion-max'>
                    Giảm tối đa
                    <span className='font-normal text-muted-foreground'>
                      (không bắt buộc)
                    </span>
                  </FieldLabel>
                  <NumberInput
                    id='promotion-max'
                    min={1}
                    step={1000}
                    suffix='₫'
                    aria-invalid={!!errors.maxDiscount}
                    {...form.register('maxDiscount', optionalNumber)}
                  />
                  {errors.maxDiscount ? (
                    <FieldError errors={[errors.maxDiscount]} />
                  ) : (
                    <FieldDescription>
                      Bỏ trống: không giới hạn.
                    </FieldDescription>
                  )}
                </Field>
              )}
            </div>
          )}
          {sampleDiscount !== null && (
            <p className='rounded-sm bg-muted/60 px-3 py-2 text-sm'>
              Ví dụ: đơn tạm tính {formatVND(sampleSubtotal)}
              {type === 'free_shipping' &&
                `, phí ship ${formatVND(SAMPLE_SHIPPING_FEE)}`}{' '}
              → giảm <strong>{formatVND(sampleDiscount)}</strong>.
            </p>
          )}
        </FieldSet>

        <FieldSet className='gap-4'>
          <FieldLegend variant='label'>Điều kiện</FieldLegend>
          <div className='grid gap-5 sm:grid-cols-3'>
            <Field data-invalid={!!errors.minOrderValue}>
              <FieldLabel htmlFor='promotion-min-order'>
                Đơn tối thiểu
              </FieldLabel>
              <NumberInput
                id='promotion-min-order'
                min={0}
                step={10000}
                suffix='₫'
                aria-invalid={!!errors.minOrderValue}
                {...form.register('minOrderValue', requiredNumber)}
              />
              {errors.minOrderValue ? (
                <FieldError errors={[errors.minOrderValue]} />
              ) : (
                <FieldDescription>Theo tạm tính, 0 = mọi đơn.</FieldDescription>
              )}
            </Field>
            <Field data-invalid={!!errors.usageLimit}>
              <FieldLabel htmlFor='promotion-usage'>Tổng lượt dùng</FieldLabel>
              <NumberInput
                id='promotion-usage'
                min={Math.max(1, editing?.usedCount ?? 0)}
                step={1}
                inputMode='numeric'
                aria-invalid={!!errors.usageLimit}
                {...form.register('usageLimit', optionalNumber)}
              />
              {errors.usageLimit ? (
                <FieldError errors={[errors.usageLimit]} />
              ) : (
                <FieldDescription>Bỏ trống: không giới hạn.</FieldDescription>
              )}
            </Field>
            <Field data-invalid={!!errors.perUserLimit}>
              <FieldLabel htmlFor='promotion-per-user'>
                Lượt mỗi khách
              </FieldLabel>
              <NumberInput
                id='promotion-per-user'
                min={1}
                step={1}
                inputMode='numeric'
                aria-invalid={!!errors.perUserLimit}
                {...form.register('perUserLimit', optionalNumber)}
              />
              {errors.perUserLimit ? (
                <FieldError errors={[errors.perUserLimit]} />
              ) : (
                <FieldDescription>Tính theo đơn chưa hủy.</FieldDescription>
              )}
            </Field>
          </div>
        </FieldSet>

        <div className='grid gap-5 sm:grid-cols-2'>
          <Field data-invalid={!!errors.startsAt}>
            <FieldLabel htmlFor='promotion-starts'>Bắt đầu</FieldLabel>
            <Input
              id='promotion-starts'
              type='datetime-local'
              aria-invalid={!!errors.startsAt}
              {...form.register('startsAt')}
            />
            {errors.startsAt ? (
              <FieldError errors={[errors.startsAt]} />
            ) : (
              !editing && (
                <FieldDescription>Bỏ trống: áp dụng ngay.</FieldDescription>
              )
            )}
          </Field>
          <Field data-invalid={!!errors.endsAt}>
            <FieldLabel htmlFor='promotion-ends'>Kết thúc</FieldLabel>
            <Input
              id='promotion-ends'
              type='datetime-local'
              aria-invalid={!!errors.endsAt}
              {...form.register('endsAt')}
            />
            {errors.endsAt ? (
              <FieldError errors={[errors.endsAt]} />
            ) : (
              <FieldDescription>Bỏ trống: không hết hạn.</FieldDescription>
            )}
          </Field>
        </div>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor='promotion-description'>
            Mô tả nội bộ
            <span className='font-normal text-muted-foreground'>
              (không bắt buộc)
            </span>
          </FieldLabel>
          <Textarea
            id='promotion-description'
            rows={2}
            aria-invalid={!!errors.description}
            {...form.register('description')}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Controller
          control={form.control}
          name='isActive'
          render={({ field }) => (
            <Field orientation='horizontal'>
              <Switch
                id='promotion-active'
                checked={field.value}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
              />
              <FieldContent>
                <FieldLabel htmlFor='promotion-active'>Đang bật</FieldLabel>
                <FieldDescription>
                  Tắt để tạm ngừng mã mà không cần xóa.
                </FieldDescription>
              </FieldContent>
            </Field>
          )}
        />
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
          {pending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo mã'}
        </Button>
      </DialogFooter>
    </form>
  );
}
