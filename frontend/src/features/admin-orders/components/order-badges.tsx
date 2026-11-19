import { Badge } from '@/components/ui/badge';
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  TRANSACTION_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from '@/constants/orders';
import { cn } from '@/lib/utils';

const ORDER_DOT: Record<OrderStatus, string> = {
  pending: 'bg-foreground',
  confirmed: 'bg-foreground/70',
  processing: 'bg-foreground/70',
  shipping: 'bg-foreground/70',
  delivered: 'bg-foreground/30',
  cancelled: 'bg-transparent ring-1 ring-foreground/30',
  returned: 'bg-transparent ring-1 ring-foreground/30',
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const closed = status === 'cancelled' || status === 'returned';
  return (
    <Badge
      variant={status === 'pending' ? 'secondary' : 'outline'}
      className={cn(
        'gap-1.5 rounded-sm',
        closed && 'text-muted-foreground',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', ORDER_DOT[status])}
      />
      {ORDER_STATUSES[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={
        status === 'failed'
          ? 'destructive'
          : status === 'paid'
            ? 'secondary'
            : 'outline'
      }
      className={cn(
        'rounded-sm',
        (status === 'pending' || status === 'refunded') &&
          'text-muted-foreground',
        className,
      )}
    >
      {PAYMENT_STATUSES[status]}
    </Badge>
  );
}

export function TransactionStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={
        status === 'failed'
          ? 'destructive'
          : status === 'paid'
            ? 'secondary'
            : 'outline'
      }
      className={cn('rounded-sm', className)}
    >
      {TRANSACTION_STATUSES[status]}
    </Badge>
  );
}
