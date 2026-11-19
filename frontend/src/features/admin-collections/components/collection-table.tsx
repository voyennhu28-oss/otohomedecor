'use client';

import {
  Delete02Icon,
  Image01Icon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilEdit02Icon,
  StarIcon,
  StarOffIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  COLLECTION_STATES,
  getCollectionState,
} from '@/features/admin-collections/filters';
import type { Collection } from '@/features/collections/types';
import { cn } from '@/lib/utils';

export type CollectionRowActions = {
  onEdit: (collection: Collection) => void;
  onManageProducts: (collection: Collection) => void;
  onToggleActive: (collection: Collection) => void;
  onToggleFeatured: (collection: Collection) => void;
  onDelete: (collection: Collection) => void;
};

const formatDate = (iso: string) =>
  format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: vi });

function scheduleText(collection: Collection) {
  if (!collection.startsAt && !collection.endsAt) return 'Không giới hạn';
  if (collection.startsAt && collection.endsAt) {
    return `${formatDate(collection.startsAt)} – ${formatDate(collection.endsAt)}`;
  }
  return collection.startsAt
    ? `Từ ${formatDate(collection.startsAt)}`
    : `Đến ${formatDate(collection.endsAt as string)}`;
}

export function CollectionTable({
  collections,
  busyID,
  ...actions
}: CollectionRowActions & {
  collections: Collection[];
  busyID: string | null;
}) {
  const now = new Date();

  return (
    <div className='overflow-hidden rounded-sm border'>
      <Table>
        <TableHeader className='bg-muted/50'>
          <TableRow className='hover:bg-transparent'>
            {[
              ['Bộ sưu tập', 'pl-4'],
              ['Thời gian hiển thị', 'hidden lg:table-cell'],
              ['Thứ tự', 'hidden text-right sm:table-cell'],
              ['Trạng thái', ''],
            ].map(([label, className]) => (
              <TableHead
                key={label}
                className={cn(
                  'h-10 text-xs font-medium text-muted-foreground',
                  className,
                )}
              >
                {label}
              </TableHead>
            ))}
            <TableHead className='h-10 w-14'>
              <span className='sr-only'>Thao tác</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {collections.map((collection) => {
            const state = getCollectionState(collection, now);
            return (
              <TableRow
                key={collection.id}
                className={cn(state !== 'live' && 'text-muted-foreground')}
              >
                <TableCell className='max-w-0 min-w-64 py-2 pl-4'>
                  <div className='flex items-center gap-3'>
                    <span className='flex aspect-video w-16 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-muted text-muted-foreground'>
                      {collection.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={collection.image.url}
                          alt=''
                          loading='lazy'
                          className='size-full object-cover'
                        />
                      ) : (
                        <HugeiconsIcon
                          icon={Image01Icon}
                          size={16}
                          strokeWidth={1.5}
                        />
                      )}
                    </span>
                    <button
                      type='button'
                      onClick={() => actions.onEdit(collection)}
                      className='grid min-w-0 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    >
                      <span className='flex min-w-0 items-center gap-1.5'>
                        <span
                          className={cn(
                            'truncate font-medium hover:underline',
                            state === 'live' && 'text-foreground',
                          )}
                        >
                          {collection.name}
                        </span>
                        {collection.isFeatured && (
                          <HugeiconsIcon
                            icon={StarIcon}
                            size={14}
                            strokeWidth={1.75}
                            className='shrink-0 text-muted-foreground'
                            aria-label='Nổi bật'
                          />
                        )}
                      </span>
                      <span className='truncate font-mono text-xs text-muted-foreground'>
                        {collection.slug}
                      </span>
                    </button>
                  </div>
                </TableCell>
                <TableCell className='hidden text-muted-foreground tabular-nums lg:table-cell'>
                  {scheduleText(collection)}
                </TableCell>
                <TableCell className='hidden text-right text-muted-foreground tabular-nums sm:table-cell'>
                  {collection.sortOrder}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={state === 'live' ? 'secondary' : 'outline'}
                    className='rounded-sm'
                  >
                    {COLLECTION_STATES[state]}
                  </Badge>
                </TableCell>
                <TableCell className='pr-3 text-right'>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          className='rounded-sm text-muted-foreground'
                          aria-label={`Thao tác với "${collection.name}"`}
                          disabled={busyID === collection.id}
                        />
                      }
                    >
                      <HugeiconsIcon
                        icon={MoreHorizontalIcon}
                        strokeWidth={2}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align='end'
                      className='w-56 rounded-sm'
                    >
                      <DropdownMenuItem
                        className='rounded-sm'
                        onClick={() => actions.onEdit(collection)}
                      >
                        <HugeiconsIcon
                          icon={PencilEdit02Icon}
                          strokeWidth={1.75}
                        />
                        Sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='rounded-sm'
                        onClick={() => actions.onManageProducts(collection)}
                      >
                        <HugeiconsIcon icon={PackageIcon} strokeWidth={1.75} />
                        Quản lý sản phẩm
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='rounded-sm'
                        onClick={() => actions.onToggleActive(collection)}
                      >
                        <HugeiconsIcon
                          icon={
                            collection.isActive ? ViewOffSlashIcon : ViewIcon
                          }
                          strokeWidth={1.75}
                        />
                        {collection.isActive ? 'Tắt' : 'Bật'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='rounded-sm'
                        onClick={() => actions.onToggleFeatured(collection)}
                      >
                        <HugeiconsIcon
                          icon={collection.isFeatured ? StarOffIcon : StarIcon}
                          strokeWidth={1.75}
                        />
                        {collection.isFeatured
                          ? 'Bỏ nổi bật'
                          : 'Đánh dấu nổi bật'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant='destructive'
                        className='rounded-sm'
                        onClick={() => actions.onDelete(collection)}
                      >
                        <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.75} />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
