'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { NumberInput } from '@/components/admin/number-input';
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
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { useUpdateStock } from '@/features/admin-products/hooks/use-admin-products';
import type { ProductVariant } from '@/features/products/types';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { cn } from '@/lib/utils';

type Mode = 'adjust' | 'set';

export function StockDialog({
  variant: variantProp,
  onClose,
}: {
  variant: ProductVariant | null;
  onClose: () => void;
}) {
  const variant = useRetainedValue(variantProp);
  const [openCount, setOpenCount] = useState(0);
  const [lastVariant, setLastVariant] = useState(variantProp);
  if (variantProp !== null && variantProp !== lastVariant) {
    setLastVariant(variantProp);
    setOpenCount((count) => count + 1);
  }

  return (
    <Dialog
      open={variantProp !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className='rounded-sm sm:max-w-md'>
        {variant && (
          <StockForm key={openCount} variant={variant} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StockForm({
  variant,
  onDone,
}: {
  variant: ProductVariant;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<Mode>('adjust');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateStock();

  const amount = text.trim() === '' ? Number.NaN : Number(text);
  const valid =
    Number.isInteger(amount) && (mode === 'set' ? amount >= 0 : amount !== 0);
  const preview = !valid
    ? null
    : mode === 'set'
      ? amount
      : variant.stock + amount;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) {
      setError(
        mode === 'set'
          ? 'Nhập số nguyên từ 0 trở lên'
          : 'Nhập số nguyên khác 0 (âm để trừ kho)',
      );
      return;
    }
    if (preview !== null && preview < 0) {
      setError(
        `Không đủ tồn kho để trừ ${-amount} (hiện còn ${variant.stock})`,
      );
      return;
    }
    update.mutate(
      {
        variantID: variant.id,
        body: mode === 'set' ? { stock: amount } : { adjust: amount },
      },
      {
        onSuccess: (result) => {
          toast.success(`Tồn kho "${variant.name}": ${result.stock}`);
          onDone();
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <form noValidate onSubmit={submit} className='flex flex-col gap-5'>
      <DialogHeader>
        <DialogTitle className='text-2xl'>Điều chỉnh tồn kho</DialogTitle>
        <DialogDescription>
          {variant.name} · <span className='font-mono'>{variant.sku}</span> ·
          hiện còn <strong className='text-foreground'>{variant.stock}</strong>
        </DialogDescription>
      </DialogHeader>

      <div
        role='radiogroup'
        aria-label='Cách điều chỉnh'
        className='grid grid-cols-2 gap-1 rounded-sm bg-muted p-1'
      >
        {(
          [
            ['adjust', 'Nhập / xuất kho'],
            ['set', 'Kiểm kê (đặt số)'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type='button'
            role='radio'
            aria-checked={mode === value}
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            className={cn(
              'h-8 rounded-sm text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              mode === value
                ? 'bg-background font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Field data-invalid={!!error}>
        <FieldLabel htmlFor='stock-amount'>
          {mode === 'set' ? 'Tồn kho mới' : 'Số lượng cộng / trừ'}
        </FieldLabel>
        <NumberInput
          id='stock-amount'
          autoFocus
          step={1}
          inputMode='numeric'
          min={mode === 'set' ? 0 : undefined}
          suffix='cái'
          value={text}
          aria-invalid={!!error}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
        />
        <FieldDescription>
          {mode === 'adjust'
            ? 'Số dương để nhập thêm, số âm để trừ (vd -3).'
            : 'Đặt đúng số đếm được khi kiểm kê.'}
          {preview !== null && preview >= 0 && (
            <>
              {' '}
              Sau khi lưu:{' '}
              <strong className='text-foreground'>{preview}</strong>
            </>
          )}
        </FieldDescription>
      </Field>

      {error && <FormAlert>{error}</FormAlert>}

      <DialogFooter>
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
          disabled={update.isPending}
        >
          {update.isPending ? 'Đang lưu…' : 'Lưu tồn kho'}
        </Button>
      </DialogFooter>
    </form>
  );
}
