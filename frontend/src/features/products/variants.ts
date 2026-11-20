import type { PublicVariant } from './types';

export const FALLBACK_GROUP = 'Mẫu';

export type Selection = Record<string, string>;
export type OptionGroup = { name: string; values: string[] };
export type ValueState = 'available' | 'sold-out' | 'missing';

export type StockNote = {
  tone: 'ok' | 'low' | 'made-to-order' | 'out';
  text: string;
};

const LOW_STOCK = 5;
const MAX_PER_LINE = 99;

export function createVariantModel(
  variants: PublicVariant[],
  allowBackorder: boolean,
) {
  const names = variants[0]?.options.map((option) => option.name) ?? [];
  const consistent =
    names.length > 0 &&
    new Set(names).size === names.length &&
    variants.every(
      (variant) =>
        variant.options.length === names.length &&
        names.every((name) =>
          variant.options.some((option) => option.name === name),
        ),
    );
  const groupNames = consistent ? names : [FALLBACK_GROUP];

  const selectionOf = (variant: PublicVariant): Selection =>
    consistent
      ? Object.fromEntries(
          variant.options.map((option) => [option.name, option.value]),
        )
      : { [FALLBACK_GROUP]: variant.name };

  const canBuy = (variant: PublicVariant) =>
    allowBackorder || variant.stock > 0;

  const groups: OptionGroup[] =
    variants.length > 1
      ? groupNames.map((name) => ({
          name,
          values: [
            ...new Set(variants.map((variant) => selectionOf(variant)[name])),
          ],
        }))
      : [];

  const matches = (variant: PublicVariant, selection: Selection) => {
    const own = selectionOf(variant);
    return groupNames.every((name) => own[name] === selection[name]);
  };

  const valueState = (
    selection: Selection,
    group: string,
    value: string,
  ): ValueState => {
    const candidates = variants.filter((variant) => {
      const own = selectionOf(variant);
      return groupNames.every((name) =>
        name === group ? own[name] === value : own[name] === selection[name],
      );
    });
    if (candidates.length === 0) return 'missing';
    return candidates.some(canBuy) ? 'available' : 'sold-out';
  };

  const pick = (
    selection: Selection,
    group: string,
    value: string,
  ): PublicVariant | undefined => {
    const next = { ...selection, [group]: value };
    const exact = variants.find((variant) => matches(variant, next));
    if (exact) return exact;
    const score = (variant: PublicVariant) => {
      const own = selectionOf(variant);
      const shared = groupNames.filter(
        (name) => own[name] === selection[name],
      ).length;
      return (canBuy(variant) ? 100 : 0) + shared;
    };
    return variants
      .filter((variant) => selectionOf(variant)[group] === value)
      .sort((a, b) => score(b) - score(a))[0];
  };

  const initial = variants.find(canBuy) ?? variants[0];

  return { groups, selectionOf, canBuy, valueState, pick, initial };
}

export function stockNote(
  variant: PublicVariant,
  allowBackorder: boolean,
  leadTimeDays: number,
): StockNote {
  if (variant.stock > 0) {
    return variant.stock <= LOW_STOCK
      ? { tone: 'low', text: `Chỉ còn ${variant.stock} chiếc` }
      : { tone: 'ok', text: 'Còn hàng, giao ngay' };
  }
  if (allowBackorder) {
    return {
      tone: 'made-to-order',
      text:
        leadTimeDays > 0
          ? `Làm theo đơn, cần thêm khoảng ${leadTimeDays} ngày`
          : 'Làm theo đơn',
    };
  }
  return { tone: 'out', text: 'Tạm hết hàng' };
}

export function maxQuantity(variant: PublicVariant, allowBackorder: boolean) {
  return allowBackorder
    ? MAX_PER_LINE
    : Math.max(0, Math.min(variant.stock, MAX_PER_LINE));
}

export function discountPercent(price: number, compareAtPrice: number | null) {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  return Math.round((1 - price / compareAtPrice) * 100);
}
