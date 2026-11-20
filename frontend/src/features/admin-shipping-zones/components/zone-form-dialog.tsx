'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import {
  NumberInput,
  optionalNumber,
  requiredNumber,
} from '@/components/admin/number-input';
import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  useCreateShippingZone,
  useUpdateShippingZone,
} from '@/features/admin-shipping-zones/hooks/use-admin-shipping-zones';
import {
  toUpdateZoneInput,
  toZoneFormValues,
  toZoneInput,
  ZONE_FORM_FIELDS,
  zoneFormSchema,
  type ZoneFormValues,
} from '@/features/admin-shipping-zones/schemas';
import {
  conflictMessage,
  estimateShippingFee,
  provinceOwners,
} from '@/features/admin-shipping-zones/zone-rules';
import type { ShippingZone } from '@/features/shipping-zones/types';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { ApiError } from '@/lib/api-client';
import { setServerErrors } from '@/lib/form-errors';
import { formatVND } from '@/lib/format';

import { ProvincePicker } from './province-picker';

export type ZoneFormTarget =
  { mode: 'create' } | { mode: 'edit'; zone: ShippingZone };

export function ZoneFormDialog({
  target: targetProp,
  zones,
  onClose,
}: {
  target: ZoneFormTarget | null;
  zones: ShippingZone[];
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
          <ZoneForm
            key={openCount}
            editing={target.mode === 'edit' ? target.zone : null}
            zones={zones}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ZoneForm({
  editing,
  zones,
  onDone,
}: {
  editing: ShippingZone | null;
  zones: ShippingZone[];
  onDone: () => void;
}) {
  const owners = useMemo(
    () => provinceOwners(zones, editing?.id),
    [zones, editing],
  );
  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(
      zoneFormSchema.superRefine((values, ctx) => {
        if (!values.isActive) return;
        const message = conflictMessage(values.provinces, owners);
        if (message)
          ctx.addIssue({ code: 'custom', path: ['provinces'], message });
      }),
    ),
    defaultValues: toZoneFormValues(editing),
  });
  const { errors, isDirty } = form.formState;
  const create = useCreateShippingZone();
  const update = useUpdateShippingZone();
  const pending = create.isPending || update.isPending;
  const watched = useWatch({ control: form.control });

  const onError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 409) {
      form.setError('provinces', { message: error.message });
      return;
    }
    setServerErrors(form.setError, error, { fields: ZONE_FORM_FIELDS });
  };

  const onSubmit = (values: ZoneFormValues) => {
    if (!editing) {
      create.mutate(toZoneInput(values), {
        onSuccess: (zone) => {
          toast.success(`Đã thêm vùng "${zone.name}"`);
          onDone();
        },
        onError,
      });
      return;
    }
    const body = toUpdateZoneInput(values, editing);
    if (Object.keys(body).length === 0) return onDone();
    update.mutate(
      { id: editing.id, body },
      {
        onSuccess: (zone) => {
          toast.success(`Đã lưu vùng "${zone.name}"`);
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
          {editing ? `Sửa vùng "${editing.name}"` : 'Thêm vùng giao hàng'}
        </DialogTitle>
        <DialogDescription>
          Mỗi tỉnh chỉ thuộc 1 vùng đang hoạt động. Tỉnh không thuộc vùng nào
          thì khách không đặt hàng được.
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className='no-scrollbar min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-5'>
        <div className='grid gap-5 sm:grid-cols-[1fr_160px]'>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor='zone-name'>Tên vùng</FieldLabel>
            <Input
              id='zone-name'
              autoFocus={!editing}
              placeholder='vd: Nội thành Hồ Chí Minh'
              aria-invalid={!!errors.name}
              {...form.register('name')}
            />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field data-invalid={!!errors.estimatedDays}>
            <FieldLabel htmlFor='zone-days'>Thời gian giao</FieldLabel>
            <NumberInput
              id='zone-days'
              min={1}
              max={60}
              step={1}
              inputMode='numeric'
              suffix='ngày'
              aria-invalid={!!errors.estimatedDays}
              {...form.register('estimatedDays', requiredNumber)}
            />
            <FieldError errors={[errors.estimatedDays]} />
          </Field>
        </div>

        <Controller
          control={form.control}
          name='provinces'
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error}>
              <FieldLabel>Tỉnh / thành giao được</FieldLabel>
              <ProvincePicker
                value={field.value}
                onChange={field.onChange}
                owners={owners}
                blockOwned={watched.isActive ?? true}
                invalid={!!fieldState.error}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <FieldSet className='gap-4'>
          <FieldLegend variant='label'>Biểu phí</FieldLegend>
          <div className='grid gap-5 sm:grid-cols-3'>
            <Field data-invalid={!!errors.baseFee}>
              <FieldLabel htmlFor='zone-base-fee'>Phí cơ bản</FieldLabel>
              <NumberInput
                id='zone-base-fee'
                min={0}
                step={1000}
                suffix='₫'
                aria-invalid={!!errors.baseFee}
                {...form.register('baseFee', requiredNumber)}
              />
              <FieldError errors={[errors.baseFee]} />
            </Field>
            <Field data-invalid={!!errors.baseWeightKg}>
              <FieldLabel htmlFor='zone-base-weight'>
                Cho bao nhiêu kg đầu
              </FieldLabel>
              <NumberInput
                id='zone-base-weight'
                min={0}
                step='any'
                suffix='kg'
                aria-invalid={!!errors.baseWeightKg}
                {...form.register('baseWeightKg', requiredNumber)}
              />
              <FieldError errors={[errors.baseWeightKg]} />
            </Field>
            <Field data-invalid={!!errors.feePerKg}>
              <FieldLabel htmlFor='zone-per-kg'>Mỗi kg tiếp theo</FieldLabel>
              <NumberInput
                id='zone-per-kg'
                min={0}
                step={1000}
                suffix='₫'
                aria-invalid={!!errors.feePerKg}
                {...form.register('feePerKg', requiredNumber)}
              />
              <FieldError errors={[errors.feePerKg]} />
            </Field>
            <Field data-invalid={!!errors.bulkySurcharge}>
              <FieldLabel htmlFor='zone-bulky'>Phụ phí cồng kềnh</FieldLabel>
              <NumberInput
                id='zone-bulky'
                min={0}
                step={10000}
                suffix='₫'
                aria-invalid={!!errors.bulkySurcharge}
                {...form.register('bulkySurcharge', requiredNumber)}
              />
              {errors.bulkySurcharge ? (
                <FieldError errors={[errors.bulkySurcharge]} />
              ) : (
                <FieldDescription>
                  Sản phẩm ≥ 30kg (tính cả kích thước) hoặc cạnh ≥ 150cm.
                </FieldDescription>
              )}
            </Field>
            <Field
              data-invalid={!!errors.freeShipThreshold}
              className='sm:col-span-2'
            >
              <FieldLabel htmlFor='zone-free'>
                Miễn phí ship cho đơn từ
                <span className='font-normal text-muted-foreground'>
                  (không bắt buộc)
                </span>
              </FieldLabel>
              <NumberInput
                id='zone-free'
                min={1}
                step={100000}
                suffix='₫'
                aria-invalid={!!errors.freeShipThreshold}
                {...form.register('freeShipThreshold', optionalNumber)}
              />
              {errors.freeShipThreshold ? (
                <FieldError errors={[errors.freeShipThreshold]} />
              ) : (
                <FieldDescription>
                  Theo tạm tính. Đơn có hàng cồng kềnh vẫn tính phí. Bỏ trống:
                  không miễn phí.
                </FieldDescription>
              )}
            </Field>
          </div>
          <FeeCalculator values={watched} />
        </FieldSet>

        <Controller
          control={form.control}
          name='isActive'
          render={({ field }) => (
            <Field orientation='horizontal'>
              <Switch
                id='zone-active'
                checked={field.value}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
              />
              <FieldContent>
                <FieldLabel htmlFor='zone-active'>Đang hoạt động</FieldLabel>
                <FieldDescription>
                  Tắt thì các tỉnh trong vùng tạm thời không đặt hàng được (trừ
                  khi có vùng khác nhận).
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
          {pending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm vùng'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function FeeCalculator({ values }: { values: Partial<ZoneFormValues> }) {
  const [weight, setWeight] = useState('8');
  const [subtotal, setSubtotal] = useState('1000000');
  const [bulky, setBulky] = useState(false);

  const ready = [values.baseFee, values.baseWeightKg, values.feePerKg].every(
    (value) => typeof value === 'number' && Number.isFinite(value),
  );
  const weightKg = Number(weight);
  const subtotalValue = Number(subtotal);
  const result =
    ready && weightKg >= 0 && subtotalValue >= 0
      ? estimateShippingFee(
          {
            baseFee: values.baseFee as number,
            baseWeightKg: values.baseWeightKg as number,
            feePerKg: values.feePerKg as number,
            bulkySurcharge: Number.isFinite(values.bulkySurcharge)
              ? (values.bulkySurcharge as number)
              : 0,
            freeShipThreshold: values.freeShipThreshold ?? null,
          },
          { weightKg, subtotal: subtotalValue, bulky },
        )
      : null;

  return (
    <div className='flex flex-col gap-3 rounded-sm bg-muted/50 p-3'>
      <p className='text-xs font-medium text-muted-foreground'>Thử tính phí</p>
      <div className='grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end'>
        <label className='flex flex-col gap-1 text-xs text-muted-foreground'>
          Tổng khối lượng
          <NumberInput
            min={0}
            step='any'
            suffix='kg'
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            className='h-8 bg-background'
          />
        </label>
        <label className='flex flex-col gap-1 text-xs text-muted-foreground'>
          Tạm tính đơn
          <NumberInput
            min={0}
            step={100000}
            suffix='₫'
            value={subtotal}
            onChange={(event) => setSubtotal(event.target.value)}
            className='h-8 bg-background'
          />
        </label>
        <label className='flex h-8 items-center gap-2 text-sm'>
          <Checkbox
            checked={bulky}
            onCheckedChange={(checked) => setBulky(checked)}
          />
          Có hàng cồng kềnh
        </label>
      </div>
      <p className='text-sm' aria-live='polite'>
        {!result ? (
          <span className='text-muted-foreground'>
            Nhập phí cơ bản, số kg đầu và phí mỗi kg để xem.
          </span>
        ) : result.free ? (
          <>
            Phí ship: <strong>Miễn phí</strong> (đơn đủ ngưỡng miễn phí).
          </>
        ) : (
          <>
            Phí ship: <strong>{formatVND(result.fee)}</strong>
            <span className='text-muted-foreground'>
              {' '}
              = {formatVND(values.baseFee as number)}
              {result.extraKg > 0 &&
                ` + ${result.extraKg} × ${formatVND(values.feePerKg as number)}`}
              {bulky &&
                Number.isFinite(values.bulkySurcharge) &&
                ` + ${formatVND(values.bulkySurcharge as number)} cồng kềnh`}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
