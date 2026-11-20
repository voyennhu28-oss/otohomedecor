'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { MATERIALS, type Material, ROOMS, STYLES } from '@/constants/catalog';
import {
  type CatalogQuery,
  catalogHref,
  clearedQuery,
  countActiveFilters,
} from '@/features/catalog/product-query';
import type { PublicCategoryNode } from '@/features/categories/types';
import type { PublicCollection } from '@/features/collections/types';
import type { ProductFilterOptions } from '@/features/products/types';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

import { CatalogLink, useCatalogNav } from './catalog-nav';

export type CatalogFiltersProps = {
  query: CatalogQuery;
  options: ProductFilterOptions | null;
  categories: PublicCategoryNode[];
  collections: PublicCollection[];
};

export function CatalogFilters({
  query,
  options,
  categories,
  collections,
}: CatalogFiltersProps) {
  const { navigate } = useCatalogNav();
  const apply = (patch: Partial<CatalogQuery>) =>
    navigate(catalogHref(query, patch), { toResults: true });
  const active = countActiveFilters(query);

  return (
    <div className='flex flex-col'>
      <div className='flex items-baseline justify-between gap-4 pb-6'>
        <p className='label-caps'>Bộ lọc</p>
        {active > 0 && (
          <CatalogLink
            href={catalogHref(clearedQuery(query))}
            toResults
            className='text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground'
          >
            Xóa tất cả ({active})
          </CatalogLink>
        )}
      </div>

      {categories.length > 0 && (
        <FilterSection title='Danh mục'>
          <ul className='flex flex-col gap-1'>
            <NavItem
              href={catalogHref(query, { category: undefined })}
              active={!query.category}
            >
              Tất cả
            </NavItem>
            {categories.map((node) => (
              <li key={node.id}>
                <NavItem
                  as='div'
                  href={catalogHref(query, { category: node.slug })}
                  active={query.category === node.slug}
                >
                  {node.name}
                </NavItem>
                {node.children.length > 0 && (
                  <ul className='ml-3 flex flex-col gap-1 border-l pl-3'>
                    {node.children.map((child) => (
                      <NavItem
                        key={child.id}
                        href={catalogHref(query, { category: child.slug })}
                        active={query.category === child.slug}
                      >
                        {child.name}
                      </NavItem>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </FilterSection>
      )}

      {collections.length > 0 && (
        <FilterSection title='Bộ sưu tập'>
          <ul className='flex flex-col gap-1'>
            <NavItem
              href={catalogHref(query, { collection: undefined })}
              active={!query.collection}
            >
              Tất cả
            </NavItem>
            {collections.map((collection) => (
              <NavItem
                key={collection.id}
                href={catalogHref(query, { collection: collection.slug })}
                active={query.collection === collection.slug}
              >
                {collection.name}
              </NavItem>
            ))}
          </ul>
        </FilterSection>
      )}

      {options && options.materials.length > 0 && (
        <FilterSection title='Chất liệu'>
          <ul className='flex flex-col gap-3'>
            {options.materials.map((material) => {
              const checked = query.material?.includes(material) ?? false;
              return (
                <li key={material}>
                  <label className='flex cursor-pointer items-center gap-3 text-sm'>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) =>
                        apply({
                          material: toggleMaterial(
                            query.material,
                            material,
                            next,
                          ),
                        })
                      }
                    />
                    {MATERIALS[material]}
                  </label>
                </li>
              );
            })}
          </ul>
        </FilterSection>
      )}

      {options && options.rooms.length > 0 && (
        <FilterSection title='Không gian'>
          <ChipGroup
            label='Không gian'
            items={options.rooms.map((room) => [room, ROOMS[room]])}
            value={query.room}
            onChange={(room) => apply({ room })}
          />
        </FilterSection>
      )}

      {options && options.styles.length > 0 && (
        <FilterSection title='Phong cách'>
          <ChipGroup
            label='Phong cách'
            items={options.styles.map((style) => [style, STYLES[style]])}
            value={query.style}
            onChange={(style) => apply({ style })}
          />
        </FilterSection>
      )}

      {options && options.colors.length > 0 && (
        <FilterSection title='Màu sắc'>
          <ChipGroup
            label='Màu sắc'
            items={options.colors.map((color) => [color, color])}
            value={query.color}
            onChange={(color) => apply({ color })}
          />
        </FilterSection>
      )}

      {options && options.price.max > 0 && (
        <FilterSection title='Khoảng giá'>
          <PriceFilter
            min={query.minPrice}
            max={query.maxPrice}
            range={options.price}
            onApply={(minPrice, maxPrice) => apply({ minPrice, maxPrice })}
          />
        </FilterSection>
      )}

      <FilterSection title='Tình trạng'>
        <label className='flex cursor-pointer items-center justify-between gap-4 text-sm'>
          Còn hàng hoặc nhận làm theo đơn
          <Switch
            checked={query.inStock ?? false}
            onCheckedChange={(next) => apply({ inStock: next || undefined })}
          />
        </label>
      </FilterSection>
    </div>
  );
}

function toggleMaterial(
  current: Material[] | undefined,
  material: Material,
  checked: boolean,
) {
  const next = checked
    ? [...(current ?? []), material]
    : (current ?? []).filter((item) => item !== material);
  return next.length > 0 ? next : undefined;
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className='border-t py-6'>
      <h2 className='mb-4 font-sans text-sm font-semibold'>{title}</h2>
      {children}
    </section>
  );
}

function NavItem({
  href,
  active,
  as = 'li',
  children,
}: {
  href: string;
  active: boolean;
  as?: 'li' | 'div';
  children: React.ReactNode;
}) {
  const Tag = as;
  return (
    <Tag>
      <CatalogLink
        href={href}
        toResults
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group/nav flex items-center gap-2 py-1 text-sm transition-colors outline-none focus-visible:underline',
          active
            ? 'font-medium text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'h-px bg-foreground transition-all duration-500 ease-soft motion-reduce:transition-none',
            active ? 'w-4' : 'w-0 group-hover/nav:w-2',
          )}
        />
        {children}
      </CatalogLink>
    </Tag>
  );
}

function ChipGroup<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: [T, string][];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
}) {
  return (
    <div role='group' aria-label={label} className='flex flex-wrap gap-2'>
      {items.map(([key, text]) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type='button'
            aria-pressed={selected}
            onClick={() => onChange(selected ? undefined : key)}
            className={cn(
              'h-9 rounded-sm border px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
              selected
                ? 'border-foreground bg-foreground text-background'
                : 'text-muted-foreground hover:border-foreground/40 hover:text-foreground',
            )}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

function PriceFilter({
  min,
  max,
  range,
  onApply,
}: {
  min: number | undefined;
  max: number | undefined;
  range: { min: number; max: number };
  onApply: (min: number | undefined, max: number | undefined) => void;
}) {
  const [draft, setDraft] = useState({ min: toText(min), max: toText(max) });
  const [synced, setSynced] = useState({ min, max });
  if (synced.min !== min || synced.max !== max) {
    setSynced({ min, max });
    setDraft({ min: toText(min), max: toText(max) });
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextMin = toNumber(draft.min);
    const nextMax = toNumber(draft.max);
    if (nextMin !== undefined && nextMax !== undefined && nextMin > nextMax) {
      onApply(nextMax, nextMin);
    } else {
      onApply(nextMin, nextMax);
    }
  };

  return (
    <form onSubmit={submit} className='flex flex-col gap-3'>
      <p className='text-xs text-muted-foreground'>
        Sản phẩm hiện có từ {formatVND(range.min)} đến {formatVND(range.max)}
      </p>
      <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-2'>
        <Input
          inputMode='numeric'
          aria-label='Giá từ'
          placeholder='Từ'
          value={draft.min}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, min: digits(event.target.value) }))
          }
          className='h-10 rounded-sm tabular-nums'
        />
        <span aria-hidden className='text-muted-foreground'>
          –
        </span>
        <Input
          inputMode='numeric'
          aria-label='Giá đến'
          placeholder='Đến'
          value={draft.max}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, max: digits(event.target.value) }))
          }
          className='h-10 rounded-sm tabular-nums'
        />
      </div>
      <div className='flex gap-2'>
        <Button
          type='submit'
          variant='outline'
          className='h-10 flex-1 rounded-sm'
        >
          Áp dụng
        </Button>
        {(min !== undefined || max !== undefined) && (
          <Button
            type='button'
            variant='ghost'
            className='h-10 rounded-sm'
            onClick={() => onApply(undefined, undefined)}
          >
            Bỏ
          </Button>
        )}
      </div>
    </form>
  );
}

const numberFormat = new Intl.NumberFormat('vi-VN');

function digits(value: string) {
  const raw = value.replace(/\D/g, '').slice(0, 12);
  return raw ? numberFormat.format(Number(raw)) : '';
}

function toText(value: number | undefined) {
  return value === undefined ? '' : numberFormat.format(value);
}

function toNumber(text: string) {
  const raw = text.replace(/\D/g, '');
  return raw ? Number(raw) : undefined;
}
