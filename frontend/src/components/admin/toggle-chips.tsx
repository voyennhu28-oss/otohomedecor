'use client';

import { Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { cn } from '@/lib/utils';

type ToggleChipsProps<T extends string> = {
  options: Record<T, string>;
  value: T[];
  onChange: (value: T[]) => void;
  label: string;
  id?: string;
};

export function ToggleChips<T extends string>({
  options,
  value,
  onChange,
  label,
  id,
}: ToggleChipsProps<T>) {
  const toggle = (key: T) =>
    onChange(
      value.includes(key)
        ? value.filter((item) => item !== key)
        : [...value, key],
    );

  return (
    <div
      id={id}
      role='group'
      aria-label={label}
      className='flex flex-wrap gap-1.5'
    >
      {(Object.entries(options) as [T, string][]).map(([key, text]) => {
        const selected = value.includes(key);
        return (
          <button
            key={key}
            type='button'
            aria-pressed={selected}
            onClick={() => toggle(key)}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-sm border px-2.5 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-foreground/30 bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {selected && (
              <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={2.5} />
            )}
            {text}
          </button>
        );
      })}
    </div>
  );
}
