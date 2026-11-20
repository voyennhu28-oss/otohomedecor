'use client';

import {
  Cancel01Icon,
  FilterHorizontalIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  PRODUCT_SORTS,
  catalogHref,
  countActiveFilters,
} from '@/features/catalog/product-query';
import type { ProductSort } from '@/features/products/types';

import { CatalogFilters, type CatalogFiltersProps } from './catalog-filters';
import { useCatalogNav } from './catalog-nav';

type CatalogToolbarProps = CatalogFiltersProps & { totalItems: number | null };

export function CatalogToolbar({
  totalItems,
  ...filters
}: CatalogToolbarProps) {
  const { query } = filters;
  const { navigate } = useCatalogNav();
  const active = countActiveFilters(query);

  return (
    <div className='flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between'>
      <p
        className='text-sm text-muted-foreground tabular-nums'
        aria-live='polite'
      >
        {totalItems === null ? ' ' : `${totalItems} sản phẩm`}
      </p>
      <div className='flex flex-wrap items-center gap-3'>
        <SearchBox
          value={query.q ?? ''}
          onSearch={(q) =>
            navigate(catalogHref(query, { q: q || undefined }), {
              toResults: true,
            })
          }
        />
        <label className='flex items-center gap-2 text-sm'>
          <span className='sr-only sm:not-sr-only sm:text-muted-foreground'>
            Sắp xếp
          </span>
          <NativeSelect
            value={query.sort}
            onChange={(event) =>
              navigate(
                catalogHref(query, { sort: event.target.value as ProductSort }),
                { toResults: true },
              )
            }
            className='[&_select]:h-10 [&_select]:rounded-sm [&_select]:bg-background'
          >
            {(Object.entries(PRODUCT_SORTS) as [ProductSort, string][]).map(
              ([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ),
            )}
          </NativeSelect>
        </label>
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant='outline'
                className='h-10 gap-2 rounded-sm lg:hidden'
              />
            }
          >
            <HugeiconsIcon
              icon={FilterHorizontalIcon}
              size={16}
              strokeWidth={1.75}
            />
            Bộ lọc
            {active > 0 && (
              <span className='flex size-5 items-center justify-center rounded-full bg-foreground text-[11px] text-background tabular-nums'>
                {active}
              </span>
            )}
          </SheetTrigger>
          <SheetContent side='left' className='w-[88%] gap-0 sm:max-w-sm'>
            <SheetHeader className='border-b'>
              <SheetTitle className='text-2xl'>Lọc sản phẩm</SheetTitle>
            </SheetHeader>
            <div className='no-scrollbar flex-1 overflow-y-auto px-6 pt-6'>
              <CatalogFilters {...filters} />
            </div>
            <SheetFooter className='border-t'>
              <SheetClose render={<Button className='h-12 rounded-sm' />}>
                {totalItems === null
                  ? 'Xem kết quả'
                  : `Xem ${totalItems} sản phẩm`}
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function SearchBox({
  value,
  onSearch,
}: {
  value: string;
  onSearch: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setText(value);
  }

  return (
    <form
      role='search'
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(text.trim());
      }}
      className='relative w-full sm:w-64'
    >
      <HugeiconsIcon
        icon={Search01Icon}
        size={16}
        strokeWidth={1.75}
        className='pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground'
      />
      <input
        type='search'
        value={text}
        maxLength={100}
        onChange={(event) => setText(event.target.value)}
        placeholder='Tìm tên sản phẩm'
        aria-label='Tìm sản phẩm'
        className='h-10 w-full rounded-sm border border-input bg-background pr-9 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:hidden'
      />
      {text && (
        <button
          type='button'
          aria-label='Xóa từ khóa'
          onClick={() => {
            setText('');
            if (value) onSearch('');
          }}
          className='absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground'
        >
          <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
        </button>
      )}
    </form>
  );
}
