'use client';

import {
  FilterRemoveIcon,
  UnfoldLessIcon,
  UnfoldMoreIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { SearchInput } from '@/components/admin/search-input';
import { Button } from '@/components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  LEVEL_FILTERS,
  PRODUCT_FILTERS,
  SORT_OPTIONS,
  STATUS_FILTERS,
  type CategoryFilters,
} from '@/features/admin-categories/filters';
import type { FlatCategory } from '@/features/admin-categories/tree';

type CategoryToolbarProps = {
  filters: CategoryFilters;
  onChange: (patch: Partial<Record<keyof CategoryFilters, string>>) => void;
  onReset: () => void;
  filtering: boolean;
  parentOptions: FlatCategory[];
  collapseControl: { allCollapsed: boolean; onToggleAll: () => void } | null;
};

export function CategoryToolbar({
  filters,
  onChange,
  onReset,
  filtering,
  parentOptions,
  collapseControl,
}: CategoryToolbarProps) {
  return (
    <div className='flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between'>
      <div className='flex flex-wrap items-center gap-2'>
        <SearchInput
          value={filters.q}
          onChange={(q) => onChange({ q })}
          placeholder='Tìm theo tên hoặc slug'
          label='Tìm danh mục'
          className='w-full sm:w-64'
        />

        <FilterSelect
          label='Lọc theo trạng thái'
          value={filters.status}
          options={STATUS_FILTERS}
          onChange={(status) => onChange({ status })}
        />
        <FilterSelect
          label='Lọc theo cấp'
          value={filters.level}
          options={LEVEL_FILTERS}
          onChange={(level) => onChange({ level })}
        />
        <NativeSelect
          size='sm'
          value={filters.parent}
          onChange={(event) => onChange({ parent: event.target.value })}
          aria-label='Lọc theo danh mục cha'
          className={selectClass(filters.parent !== '')}
        >
          <NativeSelectOption value=''>Thuộc mọi danh mục</NativeSelectOption>
          {parentOptions.map(({ node, depth }) => (
            <NativeSelectOption key={node.id} value={node.id}>
              {`${'   '.repeat(depth)}Thuộc: ${node.name}`}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FilterSelect
          label='Lọc theo số sản phẩm'
          value={filters.products}
          options={PRODUCT_FILTERS}
          onChange={(products) => onChange({ products })}
        />
        <FilterSelect
          label='Sắp xếp'
          value={filters.sort}
          options={SORT_OPTIONS}
          onChange={(sort) => onChange({ sort })}
          defaultValue='tree'
        />

        {filtering && (
          <Button
            variant='ghost'
            size='sm'
            className='rounded-sm text-muted-foreground'
            onClick={onReset}
          >
            <HugeiconsIcon icon={FilterRemoveIcon} strokeWidth={1.75} />
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {collapseControl && (
        <Button
          variant='ghost'
          size='sm'
          className='self-start rounded-sm text-muted-foreground lg:self-auto'
          onClick={collapseControl.onToggleAll}
        >
          <HugeiconsIcon
            icon={
              collapseControl.allCollapsed ? UnfoldMoreIcon : UnfoldLessIcon
            }
            strokeWidth={1.75}
          />
          {collapseControl.allCollapsed ? 'Mở tất cả' : 'Thu gọn tất cả'}
        </Button>
      )}
    </div>
  );
}

function selectClass(active: boolean) {
  return active
    ? '[&_select]:rounded-sm [&_select]:border-foreground/40 [&_select]:bg-background'
    : '[&_select]:rounded-sm';
}

function FilterSelect<T extends Record<string, string>>({
  label,
  value,
  options,
  onChange,
  defaultValue = 'all',
}: {
  label: string;
  value: string;
  options: T;
  onChange: (value: string) => void;
  defaultValue?: string;
}) {
  return (
    <NativeSelect
      size='sm'
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className={selectClass(value !== defaultValue)}
    >
      {Object.entries(options).map(([key, text]) => (
        <NativeSelectOption key={key} value={key}>
          {text}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
