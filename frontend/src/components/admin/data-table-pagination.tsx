'use client';

import {
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { cn } from '@/lib/utils';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  itemLabel: string;
  className?: string;
};

export function DataTablePagination({
  page,
  pageSize,
  totalItems,
  totalPages: totalPagesProp,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  itemLabel,
  className,
}: DataTablePaginationProps) {
  const totalPages = Math.max(
    1,
    totalPagesProp ?? Math.ceil(totalItems / pageSize),
  );
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-3 text-sm sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className='flex items-center gap-4 text-muted-foreground'>
        <p className='tabular-nums'>
          {from}–{to} trong {totalItems} {itemLabel}
        </p>
        <label className='flex items-center gap-2'>
          <span className='hidden sm:inline'>Mỗi trang</span>
          <NativeSelect
            size='sm'
            value={String(pageSize)}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label='Số dòng mỗi trang'
            className='[&_select]:rounded-sm'
          >
            {pageSizeOptions.map((size) => (
              <NativeSelectOption key={size} value={size}>
                {size}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
      </div>

      <nav aria-label='Phân trang' className='flex items-center gap-1'>
        <PageButton
          icon={ArrowLeftDoubleIcon}
          label='Trang đầu'
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          className='hidden sm:inline-flex'
        />
        <PageButton
          icon={ArrowLeft01Icon}
          label='Trang trước'
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />

        <span className='px-2 text-muted-foreground tabular-nums sm:hidden'>
          Trang {page} / {totalPages}
        </span>
        <div className='hidden items-center gap-1 sm:flex'>
          {getPageItems(page, totalPages).map((item, index) =>
            item === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden
                className='w-8 text-center text-muted-foreground'
              >
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page ? 'outline' : 'ghost'}
                size='icon-sm'
                className={cn(
                  'rounded-sm tabular-nums',
                  item === page && 'bg-background font-semibold',
                )}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Trang ${item}`}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            ),
          )}
        </div>

        <PageButton
          icon={ArrowRight01Icon}
          label='Trang sau'
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        />
        <PageButton
          icon={ArrowRightDoubleIcon}
          label='Trang cuối'
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className='hidden sm:inline-flex'
        />
      </nav>
    </div>
  );
}

function PageButton({
  icon,
  label,
  disabled,
  onClick,
  className,
}: {
  icon: IconSvgElement;
  label: string;
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      variant='ghost'
      size='icon-sm'
      className={cn('rounded-sm', className)}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <HugeiconsIcon icon={icon} strokeWidth={1.75} />
    </Button>
  );
}

function getPageItems(page: number, totalPages: number) {
  const pages = new Set([1, totalPages]);
  for (let p = page - 2; p <= page + 2; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | 'ellipsis')[] = [];
  sorted.forEach((p, index) => {
    const prev = sorted[index - 1];
    if (prev !== undefined && p - prev > 1) {
      items.push(p - prev === 2 ? prev + 1 : 'ellipsis');
    }
    items.push(p);
  });
  return items;
}
