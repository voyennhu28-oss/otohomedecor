'use client';

import {
  Add01Icon,
  Delete02Icon,
  LockIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  SquareUnlock02Icon,
  UserGroupIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  ConfirmDialog,
  type ConfirmContent,
} from '@/components/admin/confirm-dialog';
import { DataTablePagination } from '@/components/admin/data-table-pagination';
import {
  DataTableSkeleton,
  DataTableState,
} from '@/components/admin/data-table-state';
import { SearchInput } from '@/components/admin/search-input';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
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
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAdminUsers,
  useDeleteUser,
  useUpdateUser,
} from '@/features/admin-users/hooks/use-admin-users';
import {
  toUserQuery,
  USER_FILTER_DEFAULTS,
} from '@/features/admin-users/schemas';
import { ROLES, USER_STATUSES } from '@/features/admin-users/types';
import { UserAvatar } from '@/features/auth/components/user-avatar';
import { useMe } from '@/features/auth/hooks/use-me';
import type { User } from '@/features/auth/types';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

import { UserDetailDialog } from './user-detail-dialog';
import { UserFormDialog, type UserFormTarget } from './user-form-dialog';

const ROLE_TABS = {
  '': 'Tất cả',
  customer: 'Khách hàng',
  admin: 'Quản trị viên',
};

type PendingAction = { kind: 'lock' | 'unlock' | 'delete'; user: User };

export function UsersManager() {
  const { data: me } = useMe();
  const { values, setValues, reset } = useUrlFilters(USER_FILTER_DEFAULTS);
  const query = useMemo(() => toUserQuery(values), [values]);
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useAdminUsers(query);
  const update = useUpdateUser();
  const remove = useDeleteUser();

  const [formTarget, setFormTarget] = useState<UserFormTarget | null>(null);
  const [viewing, setViewing] = useState<User | null>(null);
  const [action, setAction] = useState<PendingAction | null>(null);
  const filtering = !!(query.q || query.role || query.status);

  const confirmContent: ConfirmContent | null = !action
    ? null
    : action.kind === 'delete'
      ? {
          title: `Xóa tài khoản ${action.user.email}?`,
          description:
            'Tài khoản bị xóa và đăng xuất. Email này không đăng ký lại được. Đơn hàng, đánh giá cũ vẫn giữ nguyên.',
          confirmLabel: 'Xóa tài khoản',
          destructive: true,
        }
      : action.kind === 'lock'
        ? {
            title: `Khóa ${action.user.email}?`,
            description:
              'Tài khoản bị đăng xuất khỏi mọi thiết bị và không đăng nhập được cho tới khi mở khóa.',
            confirmLabel: 'Khóa tài khoản',
            destructive: true,
          }
        : {
            title: `Mở khóa ${action.user.email}?`,
            description: 'Người dùng đăng nhập lại được bình thường.',
            confirmLabel: 'Mở khóa',
          };

  const runAction = () => {
    if (!action) return;
    const { kind, user } = action;
    const options = {
      onSuccess: () => {
        toast.success(
          kind === 'delete'
            ? `Đã xóa ${user.email}`
            : kind === 'lock'
              ? `Đã khóa ${user.email}`
              : `Đã mở khóa ${user.email}`,
        );
        setAction(null);
      },
      onError: (err: Error) => toast.error(err.message),
    };
    if (kind === 'delete') remove.mutate(user.id, options);
    else
      update.mutate(
        {
          id: user.id,
          body: { status: kind === 'lock' ? 'inactive' : 'active' },
        },
        options,
      );
  };

  const addButton = (
    <Button
      size='sm'
      className='rounded-sm'
      onClick={() => setFormTarget({ mode: 'create' })}
    >
      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
      Tạo tài khoản
    </Button>
  );

  return (
    <>
      <AdminPageHeader
        title='Tài khoản'
        description='Khách hàng và quản trị viên.'
        actions={addButton}
      />

      <div className='flex flex-col gap-4'>
        <Tabs
          value={query.role ?? 'all'}
          onValueChange={(value) =>
            setValues({ role: value === 'all' ? '' : String(value) })
          }
        >
          <TabsList variant='line' className='w-full justify-start border-b'>
            {Object.entries(ROLE_TABS).map(([key, label]) => (
              <TabsTrigger
                key={key || 'all'}
                value={key || 'all'}
                className='flex-none px-3'
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className='flex flex-wrap items-center gap-2'>
          <SearchInput
            value={values.q}
            onChange={(q) => setValues({ q })}
            placeholder='Tìm theo email, tên, SĐT'
            label='Tìm tài khoản'
            className='w-full sm:w-72'
          />
          <NativeSelect
            size='sm'
            value={query.status ?? ''}
            onChange={(event) => setValues({ status: event.target.value })}
            aria-label='Lọc theo trạng thái'
            className={cn(
              '[&_select]:rounded-sm',
              query.status &&
                '[&_select]:border-foreground/40 [&_select]:bg-background',
            )}
          >
            <NativeSelectOption value=''>Mọi trạng thái</NativeSelectOption>
            {Object.entries(USER_STATUSES).map(([key, label]) => (
              <NativeSelectOption key={key} value={key}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {filtering && (
            <Button
              variant='ghost'
              size='sm'
              className='rounded-sm text-muted-foreground'
              onClick={reset}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {isPending ? (
          <DataTableSkeleton label='Đang tải tài khoản' />
        ) : isError ? (
          <DataTableState
            title='Không tải được tài khoản'
            description={error.message}
            action={
              <Button
                variant='outline'
                size='sm'
                className='rounded-sm'
                onClick={() => refetch()}
              >
                Thử lại
              </Button>
            }
          />
        ) : data.list.length === 0 ? (
          <DataTableState
            icon={filtering ? undefined : UserGroupIcon}
            title={
              filtering ? 'Không có tài khoản phù hợp' : 'Chưa có tài khoản'
            }
            action={
              filtering && (
                <Button
                  variant='outline'
                  size='sm'
                  className='rounded-sm'
                  onClick={reset}
                >
                  Xóa bộ lọc
                </Button>
              )
            }
          />
        ) : (
          <>
            <div
              className={cn(
                'overflow-hidden rounded-sm border transition-opacity',
                isFetching && isPlaceholderData && 'opacity-60',
              )}
            >
              <Table>
                <TableHeader className='bg-muted/50'>
                  <TableRow className='hover:bg-transparent'>
                    {[
                      ['Tài khoản', 'pl-4'],
                      ['Số điện thoại', 'hidden md:table-cell'],
                      ['Quyền', 'hidden sm:table-cell'],
                      ['Trạng thái', ''],
                      ['Tham gia', 'hidden lg:table-cell'],
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
                  {data.list.map((user) => {
                    const isSelf = user.id === me?.id;
                    return (
                      <TableRow
                        key={user.id}
                        className={cn(
                          user.status === 'inactive' && 'text-muted-foreground',
                        )}
                      >
                        <TableCell className='max-w-0 min-w-60 py-2 pl-4'>
                          <button
                            type='button'
                            onClick={() => setViewing(user)}
                            className='flex min-w-0 items-center gap-3 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'
                          >
                            <UserAvatar user={user} shape='square' />
                            <span className='grid min-w-0'>
                              <span className='truncate font-medium hover:underline'>
                                {user.fullName}
                                {isSelf && (
                                  <span className='ml-1.5 text-xs font-normal text-muted-foreground'>
                                    (bạn)
                                  </span>
                                )}
                              </span>
                              <span className='truncate text-xs text-muted-foreground'>
                                {user.email}
                              </span>
                            </span>
                          </button>
                        </TableCell>
                        <TableCell className='hidden text-muted-foreground tabular-nums md:table-cell'>
                          {user.phone ?? '—'}
                        </TableCell>
                        <TableCell className='hidden sm:table-cell'>
                          <Badge
                            variant={
                              user.role === 'admin' ? 'secondary' : 'outline'
                            }
                            className='rounded-sm'
                          >
                            {ROLES[user.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.status === 'active'
                                ? 'outline'
                                : 'destructive'
                            }
                            className='rounded-sm'
                          >
                            {USER_STATUSES[user.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className='hidden text-muted-foreground tabular-nums lg:table-cell'>
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className='pr-3 text-right'>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant='ghost'
                                  size='icon-sm'
                                  className='rounded-sm text-muted-foreground'
                                  aria-label={`Thao tác với ${user.email}`}
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
                              className='w-52 rounded-sm'
                            >
                              <DropdownMenuItem
                                className='rounded-sm'
                                onClick={() => setViewing(user)}
                              >
                                <HugeiconsIcon
                                  icon={UserIcon}
                                  strokeWidth={1.75}
                                />
                                Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className='rounded-sm'
                                onClick={() =>
                                  setFormTarget({ mode: 'edit', user })
                                }
                              >
                                <HugeiconsIcon
                                  icon={PencilEdit02Icon}
                                  strokeWidth={1.75}
                                />
                                Sửa
                              </DropdownMenuItem>
                              {!isSelf && (
                                <>
                                  <DropdownMenuItem
                                    className='rounded-sm'
                                    onClick={() =>
                                      setAction({
                                        kind:
                                          user.status === 'active'
                                            ? 'lock'
                                            : 'unlock',
                                        user,
                                      })
                                    }
                                  >
                                    <HugeiconsIcon
                                      icon={
                                        user.status === 'active'
                                          ? LockIcon
                                          : SquareUnlock02Icon
                                      }
                                      strokeWidth={1.75}
                                    />
                                    {user.status === 'active'
                                      ? 'Khóa'
                                      : 'Mở khóa'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant='destructive'
                                    className='rounded-sm'
                                    onClick={() =>
                                      setAction({ kind: 'delete', user })
                                    }
                                  >
                                    <HugeiconsIcon
                                      icon={Delete02Icon}
                                      strokeWidth={1.75}
                                    />
                                    Xóa
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination
              page={query.page}
              pageSize={query.itemPerPage}
              totalItems={data.totalItems}
              totalPages={data.totalPages}
              itemLabel='tài khoản'
              onPageChange={(page) => setValues({ page: String(page) })}
              onPageSizeChange={(size) => setValues({ size: String(size) })}
            />
          </>
        )}
      </div>

      <UserFormDialog
        target={formTarget}
        currentUserID={me?.id}
        onClose={() => setFormTarget(null)}
      />
      <UserDetailDialog user={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        content={confirmContent}
        pending={update.isPending || remove.isPending}
        onClose={() => setAction(null)}
        onConfirm={runAction}
      />
    </>
  );
}
