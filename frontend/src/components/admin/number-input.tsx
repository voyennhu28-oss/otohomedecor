import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const requiredNumber = {
  setValueAs: (value: string | number) =>
    value === '' || value === null ? Number.NaN : Number(value),
};

export const optionalNumber = {
  setValueAs: (value: string | number | null) =>
    value === '' || value === null ? null : Number(value),
};

type NumberInputProps = Omit<React.ComponentProps<'input'>, 'type'> & {
  suffix?: string;
};

export function NumberInput({ suffix, className, ...props }: NumberInputProps) {
  return (
    <div className='relative'>
      <Input
        type='number'
        inputMode='decimal'
        className={cn('tabular-nums', suffix && 'pr-10', className)}
        {...props}
      />
      {suffix && (
        <span className='pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground'>
          {suffix}
        </span>
      )}
    </div>
  );
}
