'use client';

import Link from 'next/link';

import { StatTile } from '@/components/admin/stat-tile';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminUser } from '@/features/admin-users/hooks/use-admin-users';
import { ROLES, USER_STATUSES } from '@/features/admin-users/types';
import { UserAvatar } from '@/features/auth/components/user-avatar';
import type { User } from '@/features/auth/types';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { formatDate, formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

export function UserDetailDialog({
  user: userProp,
  onClose,
}: {
  user: User | null;
  onClose: () => void;
}) {
  const user = useRetainedValue(userProp);
  const {
    data: detail,
    isPending,
    isError,
    error,
  } = useAdminUser(userProp?.id ?? null);

  return (
    <Dialog
      open={userProp !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-sm p-0 sm:max-w-xl'>
        <DialogHeader className='shrink-0 border-b px-6 pt-6 pr-14 pb-4'>
          {user && (
            <div className='flex items-center gap-3'>
              <UserAvatar user={user} className='size-11' />
              <div className='min-w-0'>
                <DialogTitle className='truncate text-2xl'>
                  {user.fullName}
                </DialogTitle>
                <DialogDescription className='truncate'>
                  {user.email}
                  {user.phone && ` · ${user.phone}`}
                </DialogDescription>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className='no-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5 text-sm'>
          {user && (
            <div className='flex flex-wrap items-center gap-2'>
              <Badge
                variant={user.role === 'admin' ? 'secondary' : 'outline'}
                className='rounded-sm'
              >
                {ROLES[user.role]}
              </Badge>
              <Badge
                variant={user.status === 'active' ? 'outline' : 'destructive'}
                className='rounded-sm'
              >
                {USER_STATUSES[user.status]}
              </Badge>
              <span className='text-muted-foreground'>
                Tham gia {formatDate(user.createdAt)}
              </span>
            </div>
          )}

          {isError ? (
            <p className='text-destructive'>{error.message}</p>
          ) : (
            <>
              <div className='grid gap-3 sm:grid-cols-3'>
                <StatTile
                  label='Đơn hàng'
                  value={String(detail?._count.orders ?? '')}
                  loading={isPending}
                />
                <StatTile
                  label='Đã chi (đơn đã giao)'
                  value={detail ? formatVND(detail.totalSpent) : ''}
                  loading={isPending}
                />
                <StatTile
                  label='Đánh giá'
                  value={String(detail?._count.reviews ?? '')}
                  loading={isPending}
                />
              </div>

              <section className='flex flex-col gap-2'>
                <h3 className='font-sans text-sm font-semibold'>Sổ địa chỉ</h3>
                {isPending ? (
                  <Skeleton className='h-16 rounded-sm' />
                ) : detail.addresses.length === 0 ? (
                  <p className='text-muted-foreground'>Chưa lưu địa chỉ nào.</p>
                ) : (
                  <ul className='flex flex-col gap-2'>
                    {detail.addresses.map((address) => (
                      <li
                        key={address.id}
                        className={cn(
                          'rounded-sm border px-3 py-2',
                          address.isDefault && 'border-foreground/30',
                        )}
                      >
                        <div className='flex items-center gap-2'>
                          <span className='font-medium'>
                            {address.fullName}
                          </span>
                          <span className='text-muted-foreground'>
                            {address.phone}
                          </span>
                          {address.isDefault && (
                            <Badge
                              variant='secondary'
                              className='ml-auto rounded-sm'
                            >
                              Mặc định
                            </Badge>
                          )}
                        </div>
                        <p className='mt-0.5 text-muted-foreground'>
                          {[
                            address.street,
                            address.ward,
                            address.district,
                            address.province,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>

        <DialogFooter className='shrink-0 border-t bg-muted/30 px-6 py-4'>
          {user && (
            <Link
              href={`/admin/orders?by=email&q=${encodeURIComponent(user.email)}`}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'rounded-sm',
              )}
            >
              Xem đơn của khách
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
