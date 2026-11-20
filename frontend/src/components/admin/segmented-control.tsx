'use client';

import { useRef } from 'react';

import { cn } from '@/lib/utils';

type SegmentedControlProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Record<T, string>;
  label: string;
  id?: string;
  className?: string;
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  id,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const entries = Object.entries(options) as [T, string][];

  const move = (index: number, step: number) => {
    const next = (index + step + entries.length) % entries.length;
    onChange(entries[next][0]);
    refs.current[next]?.focus();
  };

  return (
    <div
      id={id}
      role='radiogroup'
      aria-label={label}
      className={cn('grid gap-1 rounded-sm bg-muted p-1', className)}
      style={{
        gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))`,
      }}
    >
      {entries.map(([key, text], index) => {
        const checked = key === value;
        return (
          <button
            key={key}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type='button'
            role='radio'
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(key)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                move(index, -1);
              }
            }}
            className={cn(
              'min-h-8 rounded-sm px-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              checked
                ? 'bg-background font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}
