'use client';

import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  delay?: number;
  className?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  delay = 300,
  className,
}: SearchInputProps) {
  const [text, setText] = useState(value);

  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
  }

  useEffect(() => {
    if (text.trim() === value.trim()) return;
    const timer = setTimeout(() => onChange(text.trim()), delay);
    return () => clearTimeout(timer);
  }, [text, value, delay, onChange]);

  return (
    <div className={cn('relative', className)}>
      <HugeiconsIcon
        icon={Search01Icon}
        size={16}
        strokeWidth={1.75}
        className='pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground'
      />
      <Input
        type='search'
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onChange(text.trim());
        }}
        placeholder={placeholder}
        aria-label={label}
        className='h-8 pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden'
      />
      {text && (
        <Button
          variant='ghost'
          size='icon-xs'
          className='absolute top-1/2 right-1.5 -translate-y-1/2 rounded-sm text-muted-foreground'
          aria-label='Xóa từ khóa'
          onClick={() => {
            setText('');
            onChange('');
          }}
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      )}
    </div>
  );
}
