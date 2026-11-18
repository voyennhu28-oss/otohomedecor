import { Badge } from '@/components/ui/badge';
import { PRODUCT_STATUSES, type ProductStatus } from '@/constants/catalog';
import { cn } from '@/lib/utils';

export function ProductStatusBadge({
  status,
  className,
}: {
  status: ProductStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={status === 'active' ? 'secondary' : 'outline'}
      className={cn(
        'rounded-sm',
        status === 'inactive' && 'text-muted-foreground',
        className,
      )}
    >
      {PRODUCT_STATUSES[status]}
    </Badge>
  );
}
