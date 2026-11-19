'use client';

import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';
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
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import {
  ORDER_ACTION_LABELS,
  ORDER_STATUSES,
  type OrderStatus,
} from '@/constants/orders';
import {
  useMarkOrderPaid,
  useUpdateOrderStatus,
} from '@/features/admin-orders/hooks/use-admin-orders';
import { transitionEffects } from '@/features/admin-orders/order-actions';
import type { Order } from '@/features/orders/types';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { formatVND } from '@/lib/format';

const NOTE_MAX = 500;

export type OrderDialogTarget =
  { kind: 'status'; status: OrderStatus } | { kind: 'mark-paid' };

export function OrderActionDialog({
  order,
  target: targetProp,
  onClose,
}: {
  order: Order;
  target: OrderDialogTarget | null;
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
      <DialogContent className='rounded-sm sm:max-w-lg'>
        {target && (
          <ActionForm
            key={openCount}
            order={order}
            target={target}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActionForm({
  order,
  target,
  onDone,
}: {
  order: Order;
  target: OrderDialogTarget;
  onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const updateStatus = useUpdateOrderStatus();
  const markPaid = useMarkOrderPaid();
  const pending = updateStatus.isPending || markPaid.isPending;

  const isStatus = target.kind === 'status';
  const isCancel = isStatus && target.status === 'cancelled';
  const effects = isStatus ? transitionEffects(order, target.status) : [];
  const trimmed = note.trim();
  const noteError =
    trimmed.length > NOTE_MAX
      ? `Tối đa ${NOTE_MAX} ký tự`
      : isCancel && trimmed === ''
        ? 'Nhập lý do hủy để khách biết'
        : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (noteError) return;
    const options = {
      onSuccess: () => {
        toast.success(
          isStatus
            ? `Đơn ${order.orderNumber}: ${ORDER_STATUSES[target.status]}`
            : `Đã ghi nhận thanh toán đơn ${order.orderNumber}`,
        );
        onDone();
      },
      onError: (err: Error) => setError(err.message),
    };
    if (isStatus) {
      updateStatus.mutate(
        { id: order.id, status: target.status, note: trimmed || undefined },
        options,
      );
    } else {
      markPaid.mutate({ id: order.id, note: trimmed || undefined }, options);
    }
  };

  const title = isStatus
    ? isCancel
      ? `Hủy đơn ${order.orderNumber}?`
      : `${ORDER_ACTION_LABELS[target.status]}?`
    : 'Xác nhận đã nhận tiền?';

  return (
    <form noValidate onSubmit={submit} className='flex flex-col gap-5'>
      <DialogHeader>
        <DialogTitle className='text-2xl'>{title}</DialogTitle>
        <DialogDescription>
          {isStatus ? (
            <>
              Chuyển đơn từ &quot;{ORDER_STATUSES[order.status]}&quot; sang
              &quot;{ORDER_STATUSES[target.status]}&quot;.
            </>
          ) : (
            <>
              Dùng khi khách đã chuyển khoản nhưng hệ thống không tự khớp được
              (ghi sai nội dung, chuyển nhiều lần...). Số tiền đơn:{' '}
              <strong className='text-foreground'>
                {formatVND(order.total)}
              </strong>
              .
              {order.status === 'pending' &&
                ' Đơn sẽ chuyển sang "Đã xác nhận".'}
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      {effects.length > 0 && (
        <ul className='flex flex-col gap-1.5 rounded-sm bg-muted/60 px-3 py-2.5 text-sm'>
          {effects.map((effect) => (
            <li key={effect} className='flex gap-2'>
              <HugeiconsIcon
                icon={InformationCircleIcon}
                size={16}
                strokeWidth={1.75}
                className='mt-0.5 shrink-0 text-muted-foreground'
              />
              {effect}
            </li>
          ))}
        </ul>
      )}

      <Field data-invalid={touched && !!noteError}>
        <FieldLabel htmlFor='order-action-note'>
          {isCancel ? 'Lý do hủy' : 'Ghi chú'}
          {!isCancel && (
            <span className='font-normal text-muted-foreground'>
              (không bắt buộc)
            </span>
          )}
        </FieldLabel>
        <Textarea
          id='order-action-note'
          autoFocus={isCancel}
          rows={3}
          value={note}
          aria-invalid={touched && !!noteError}
          placeholder={
            isCancel
              ? 'vd: Khách đổi ý, hết hàng mẫu này...'
              : isStatus && target.status === 'shipping'
                ? 'vd: Giao qua GHTK, mã vận đơn S123'
                : !isStatus
                  ? 'vd: Khách chuyển 2 lần, đối chiếu sao kê ngày 17/11'
                  : undefined
          }
          onChange={(event) => {
            setNote(event.target.value);
            setError(null);
          }}
        />
        {touched && noteError ? (
          <FieldError errors={[{ message: noteError }]} />
        ) : (
          <FieldDescription>
            {isCancel
              ? 'Lưu vào lịch sử đơn và gửi kèm email cho khách.'
              : 'Lưu vào lịch sử đơn.'}
          </FieldDescription>
        )}
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
          Quay lại
        </Button>
        <Button
          type='submit'
          size='sm'
          variant={isCancel ? 'destructive' : 'default'}
          className='rounded-sm'
          disabled={pending}
        >
          {pending
            ? 'Đang lưu…'
            : isStatus
              ? ORDER_ACTION_LABELS[target.status]
              : 'Xác nhận đã nhận tiền'}
        </Button>
      </DialogFooter>
    </form>
  );
}
