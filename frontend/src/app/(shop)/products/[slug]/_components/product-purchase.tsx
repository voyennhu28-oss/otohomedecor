'use client';

import {
  MinusSignIcon,
  PlusSignIcon,
  ShoppingBag02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMemo, useState } from 'react';

import { useAddToCart } from '@/features/cart/hooks/use-add-to-cart';
import type {
  ImageItem,
  ProductDetail,
  PublicVariant,
} from '@/features/products/types';
import {
  type StockNote,
  createVariantModel,
  discountPercent,
  maxQuantity,
  stockNote,
} from '@/features/products/variants';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

import { ProductGallery } from './product-gallery';

const STOCK_DOT: Record<StockNote['tone'], string> = {
  ok: 'bg-foreground',
  low: 'bg-foreground/60',
  'made-to-order': 'border border-foreground bg-transparent',
  out: 'bg-border',
};

function sortImages(images: ImageItem[]) {
  return [...images].sort((a, b) => a.sortOrder - b.sortOrder);
}

function galleryFor(product: ProductDetail, variant: PublicVariant) {
  const seen = new Set<string>();
  return [...sortImages(variant.images), ...sortImages(product.images)].filter(
    (image) => {
      if (seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    },
  );
}

const numberFormat = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 1,
});

export function ProductPurchase({
  product,
  header,
}: {
  product: ProductDetail;
  header: React.ReactNode;
}) {
  const model = useMemo(
    () => createVariantModel(product.variants, product.allowBackorder),
    [product.variants, product.allowBackorder],
  );
  const [variant, setVariant] = useState(model.initial);
  const [quantity, setQuantity] = useState(1);
  const { add, isPending } = useAddToCart();

  const selection = variant ? model.selectionOf(variant) : {};
  const images = useMemo(
    () => (variant ? galleryFor(product, variant) : sortImages(product.images)),
    [product, variant],
  );

  if (!variant) {
    return (
      <div className='grid gap-10 lg:grid-cols-12 lg:gap-16'>
        <div className='lg:col-span-7'>
          <ProductGallery images={images} name={product.name} />
        </div>
        <div className='flex flex-col gap-6 lg:col-span-5'>
          {header}
          <p className='text-muted-foreground'>Mẫu này đang tạm ngừng bán.</p>
        </div>
      </div>
    );
  }

  const limit = maxQuantity(variant, product.allowBackorder);
  const note = stockNote(variant, product.allowBackorder, product.leadTimeDays);
  const discount = discountPercent(variant.price, variant.compareAtPrice);
  const choose = (next: PublicVariant | undefined) => {
    if (!next) return;
    setVariant(next);
    setQuantity((value) =>
      Math.max(
        1,
        Math.min(value, maxQuantity(next, product.allowBackorder) || 1),
      ),
    );
  };

  return (
    <div className='grid gap-10 lg:grid-cols-12 lg:gap-16'>
      <div className='lg:col-span-7'>
        <div className='lg:sticky lg:top-28'>
          <ProductGallery images={images} name={product.name} />
        </div>
      </div>

      <div className='flex flex-col gap-8 lg:col-span-5'>
        {header}

        <div className='flex flex-wrap items-baseline gap-x-4 gap-y-2 border-y py-6'>
          <p className='font-heading text-4xl font-semibold tabular-nums'>
            {formatVND(variant.price)}
          </p>
          {discount !== null && variant.compareAtPrice && (
            <>
              <p className='text-muted-foreground tabular-nums line-through'>
                {formatVND(variant.compareAtPrice)}
              </p>
              <span className='rounded-sm border border-foreground px-2 py-0.5 text-xs font-medium tabular-nums'>
                −{discount}%
              </span>
            </>
          )}
        </div>

        {model.groups.map((group) => (
          <fieldset key={group.name} className='flex flex-col gap-3'>
            <legend className='mb-3 text-sm'>
              <span className='font-semibold'>{group.name}</span>
              <span className='text-muted-foreground'>
                : {selection[group.name]}
              </span>
            </legend>
            <div className='flex flex-wrap gap-2'>
              {group.values.map((value) => {
                const selected = selection[group.name] === value;
                const state = model.valueState(selection, group.name, value);
                return (
                  <button
                    key={value}
                    type='button'
                    aria-pressed={selected}
                    aria-label={
                      state === 'available'
                        ? value
                        : `${value} (${state === 'sold-out' ? 'tạm hết' : 'không có với lựa chọn hiện tại'})`
                    }
                    onClick={() =>
                      choose(model.pick(selection, group.name, value))
                    }
                    className={cn(
                      'min-h-11 min-w-14 rounded-sm border px-4 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                      selected
                        ? 'border-foreground bg-foreground text-background'
                        : 'hover:border-foreground/50',
                      !selected &&
                        state === 'sold-out' &&
                        'text-muted-foreground line-through',
                      !selected &&
                        state === 'missing' &&
                        'border-dashed text-muted-foreground',
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <p className='flex items-center gap-2.5 text-sm' aria-live='polite'>
          <span
            aria-hidden
            className={cn('size-2 rounded-full', STOCK_DOT[note.tone])}
          />
          {note.text}
        </p>

        <div className='flex flex-col gap-3 sm:flex-row'>
          <div className='flex h-14 items-center rounded-sm border sm:w-36'>
            <StepButton
              label='Giảm số lượng'
              disabled={quantity <= 1 || limit === 0}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            >
              <HugeiconsIcon
                icon={MinusSignIcon}
                size={16}
                strokeWidth={1.75}
              />
            </StepButton>
            <input
              type='number'
              inputMode='numeric'
              aria-label='Số lượng'
              min={1}
              max={Math.max(limit, 1)}
              value={quantity}
              disabled={limit === 0}
              onChange={(event) => {
                const next = Math.floor(Number(event.target.value));
                if (Number.isFinite(next)) {
                  setQuantity(Math.max(1, Math.min(next, Math.max(limit, 1))));
                }
              }}
              className='h-full w-full min-w-0 [appearance:textfield] bg-transparent text-center text-base tabular-nums outline-none disabled:text-muted-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
            />
            <StepButton
              label='Tăng số lượng'
              disabled={quantity >= limit}
              onClick={() => setQuantity((value) => Math.min(limit, value + 1))}
            >
              <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={1.75} />
            </StepButton>
          </div>
          <button
            type='button'
            disabled={limit === 0 || isPending}
            onClick={() =>
              add({
                variantID: variant.id,
                quantity,
                label: `${product.name} · ${variant.name}`,
              })
            }
            className='group/add flex h-14 flex-1 items-center justify-between gap-4 rounded-sm bg-foreground px-6 text-background transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40'
          >
            <span className='label-caps'>
              {limit === 0
                ? 'Tạm hết hàng'
                : isPending
                  ? 'Đang thêm…'
                  : 'Thêm vào giỏ'}
            </span>
            <HugeiconsIcon
              icon={ShoppingBag02Icon}
              size={20}
              strokeWidth={1.5}
              className='transition-transform duration-500 ease-soft group-hover/add:-translate-y-0.5 motion-reduce:transition-none'
            />
          </button>
        </div>

        <dl className='grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 border-t pt-6 text-sm'>
          {variant.dimensions && (
            <Fact term='Kích thước'>
              {variant.dimensions.lengthCm} × {variant.dimensions.widthCm} ×{' '}
              {variant.dimensions.heightCm} cm
              <span className='text-muted-foreground'> (dài × rộng × cao)</span>
            </Fact>
          )}
          {variant.weightKg > 0 && (
            <Fact term='Cân nặng'>
              {numberFormat.format(variant.weightKg)} kg
            </Fact>
          )}
          {product.warrantyMonths > 0 && (
            <Fact term='Bảo hành'>{product.warrantyMonths} tháng</Fact>
          )}
          <Fact term='Lắp đặt'>
            {product.requiresAssembly
              ? product.assemblyFee > 0
                ? `Cần lắp đặt, phí ${formatVND(product.assemblyFee)}`
                : 'Cần lắp đặt'
              : 'Không cần lắp đặt'}
          </Fact>
          <Fact term='Mã'>
            <span className='tabular-nums'>{variant.sku}</span>
          </Fact>
        </dl>
      </div>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className='flex h-full w-11 shrink-0 items-center justify-center text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30'
    >
      {children}
    </button>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <>
      <dt className='text-muted-foreground'>{term}</dt>
      <dd>{children}</dd>
    </>
  );
}
