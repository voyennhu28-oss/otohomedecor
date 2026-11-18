'use client';

import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

type TagsInputProps = {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
  maxLength?: number;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
};

export function TagsInput({
  id,
  value,
  onChange,
  max = 20,
  maxLength = 30,
  placeholder,
  invalid,
  describedBy,
}: TagsInputProps) {
  const [text, setText] = useState('');
  const full = value.length >= max;

  const commit = () => {
    const tags = text
      .split(',')
      .map((tag) => tag.trim().slice(0, maxLength))
      .filter(Boolean);
    if (tags.length === 0) return;
    const next = [...value];
    for (const tag of tags) {
      if (!next.includes(tag) && next.length < max) next.push(tag);
    }
    onChange(next);
    setText('');
  };

  return (
    <div
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1.5 rounded-sm border border-input bg-input/30 px-2 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        invalid && 'border-destructive',
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className='inline-flex h-6 items-center gap-1 rounded-sm bg-secondary pr-1 pl-2 text-xs text-secondary-foreground'
        >
          {tag}
          <button
            type='button'
            aria-label={`Bỏ tag "${tag}"`}
            onClick={() => onChange(value.filter((item) => item !== tag))}
            className='rounded-sm p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        disabled={full}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Backspace' && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        placeholder={full ? `Đã đủ ${max} tag` : placeholder}
        className='h-6 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed'
      />
    </div>
  );
}
