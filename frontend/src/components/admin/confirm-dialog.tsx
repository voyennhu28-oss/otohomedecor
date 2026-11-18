'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRetainedValue } from '@/hooks/use-retained-value';

export type ConfirmContent = {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmDialogProps = {
  content: ConfirmContent | null;
  pending?: boolean;
  pendingLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  content: contentProp,
  pending = false,
  pendingLabel = 'Đang xử lý…',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const content = useRetainedValue(contentProp);

  return (
    <AlertDialog
      open={contentProp !== null}
      onOpenChange={(open) => !open && !pending && onClose()}
    >
      <AlertDialogContent className='rounded-sm'>
        <AlertDialogHeader>
          <AlertDialogTitle className='text-2xl'>
            {content?.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {content?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            size='sm'
            className='rounded-sm'
            disabled={pending}
          >
            {content?.cancelLabel ?? 'Hủy'}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={content?.destructive ? 'destructive' : 'default'}
            size='sm'
            className='rounded-sm'
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? pendingLabel : content?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
