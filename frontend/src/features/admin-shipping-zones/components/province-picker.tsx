'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { CITIES, PROVINCES, type Province } from '@/constants/shipping';
import { cn } from '@/lib/utils';

const PROVINCE_ONLY = PROVINCES.filter(
  (province) => !(CITIES as readonly string[]).includes(province),
);

export function ProvincePicker({
  value,
  onChange,
  owners,
  blockOwned,
  invalid,
}: {
  value: Province[];
  onChange: (value: Province[]) => void;
  owners: Map<Province, string>;
  blockOwned: boolean;
  invalid?: boolean;
}) {
  const selected = new Set(value);
  const free = PROVINCES.filter((province) => !owners.has(province));
  const toggle = (province: Province) =>
    onChange(
      selected.has(province)
        ? value.filter((item) => item !== province)
        : [...value, province],
    );

  const group = (title: string, list: readonly Province[]) => (
    <div className='flex flex-col gap-2'>
      <p className='text-xs font-medium text-muted-foreground'>{title}</p>
      <div className='grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3'>
        {list.map((province) => {
          const owner = owners.get(province);
          const blocked = blockOwned && !!owner && !selected.has(province);
          return (
            <label
              key={province}
              className={cn(
                'flex min-w-0 items-start gap-2 rounded-sm px-1.5 py-1 text-sm',
                blocked
                  ? 'cursor-not-allowed text-muted-foreground'
                  : 'cursor-pointer hover:bg-muted/60',
              )}
              title={owner ? `Đang thuộc vùng "${owner}"` : undefined}
            >
              <Checkbox
                checked={selected.has(province)}
                disabled={blocked}
                onCheckedChange={() => toggle(province)}
                className='mt-0.5'
              />
              <span className='grid min-w-0 leading-tight'>
                <span className='truncate'>{province}</span>
                {owner && (
                  <span className='truncate text-[11px] text-muted-foreground'>
                    {owner}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-sm border p-3',
        invalid && 'border-destructive',
      )}
    >
      <div className='flex flex-wrap items-center justify-between gap-2 text-sm'>
        <span className='text-muted-foreground'>
          Đã chọn <strong className='text-foreground'>{value.length}</strong> /{' '}
          {PROVINCES.length}
        </span>
        <div className='flex gap-3 text-xs'>
          <button
            type='button'
            className='underline-offset-4 hover:underline disabled:opacity-50'
            disabled={free.every((province) => selected.has(province))}
            onClick={() =>
              onChange(
                PROVINCES.filter((p) => selected.has(p) || !owners.has(p)),
              )
            }
          >
            Chọn tất cả tỉnh chưa có vùng
          </button>
          <button
            type='button'
            className='text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50'
            disabled={value.length === 0}
            onClick={() => onChange([])}
          >
            Bỏ chọn hết
          </button>
        </div>
      </div>
      {group('Thành phố trực thuộc trung ương', CITIES)}
      {group('Tỉnh', PROVINCE_ONLY)}
    </div>
  );
}
