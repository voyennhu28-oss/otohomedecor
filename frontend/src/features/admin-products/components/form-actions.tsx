import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';

export function FormActions({
  pending,
  error,
  submitLabel,
  disabled,
  onCancel,
}: {
  pending: boolean;
  error?: string;
  submitLabel: string;
  disabled?: boolean;
  onCancel: () => void;
}) {
  return (
    <div className='sticky bottom-0 z-20 -mx-4 mt-6 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end'>
        {error && <FormAlert className='sm:mr-auto'>{error}</FormAlert>}
        <div className='flex justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='rounded-sm'
            onClick={onCancel}
            disabled={pending || disabled}
          >
            Hoàn tác
          </Button>
          <Button
            type='submit'
            size='sm'
            className='rounded-sm'
            disabled={pending || disabled}
          >
            {pending ? 'Đang lưu…' : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
