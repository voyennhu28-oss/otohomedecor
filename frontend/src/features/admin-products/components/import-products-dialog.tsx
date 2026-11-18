'use client';

import {
  CheckmarkCircle02Icon,
  FileImportIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useId, useState } from 'react';

import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useImportProducts } from '@/features/admin-products/hooks/use-admin-products';
import type { ProductImportResult } from '@/features/products/types';

const MAX_SIZE = 5 * 1024 * 1024;

export function ImportProductsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [openCount, setOpenCount] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpenCount((count) => count + 1);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-sm p-0 sm:max-w-xl'>
        <ImportForm key={openCount} onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function ImportForm({ onDone }: { onDone: () => void }) {
  const inputID = useId();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProductImportResult | null>(null);
  const importProducts = useImportProducts();

  const pick = (next: File | null) => {
    setResult(null);
    setFile(next);
    if (!next) return setError(null);
    if (!next.name.toLowerCase().endsWith('.xlsx')) {
      setError('Chỉ nhận file .xlsx');
    } else if (next.size > MAX_SIZE) {
      setError('File lớn hơn 5MB');
    } else {
      setError(null);
    }
  };

  const submit = () => {
    if (!file || error) return;
    importProducts.mutate(file, {
      onSuccess: setResult,
      onError: (err) => setError(err.message),
    });
  };

  return (
    <>
      <DialogHeader className='shrink-0 border-b px-6 pt-6 pr-14 pb-4'>
        <DialogTitle className='text-2xl'>Nhập sản phẩm từ Excel</DialogTitle>
        <DialogDescription>
          Dùng cùng định dạng với file &quot;Xuất Excel&quot;: mỗi dòng 1 biến
          thể, các dòng cùng slug gộp thành 1 sản phẩm. Chỉ tạo sản phẩm mới,
          không cập nhật sản phẩm đã có.
        </DialogDescription>
      </DialogHeader>

      <div className='no-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5'>
        <label
          htmlFor={inputID}
          className='flex cursor-pointer items-center gap-3 rounded-sm border border-dashed px-4 py-4 transition-colors hover:bg-muted/50 has-focus-visible:ring-2 has-focus-visible:ring-ring'
        >
          <span className='flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground'>
            <HugeiconsIcon icon={FileImportIcon} size={20} strokeWidth={1.5} />
          </span>
          <span className='min-w-0 flex-1'>
            <span className='block truncate text-sm font-medium'>
              {file ? file.name : 'Chọn file .xlsx'}
            </span>
            <span className='block text-xs text-muted-foreground'>
              {file
                ? `${(file.size / 1024).toFixed(0)} KB`
                : 'Tối đa 5MB, 2000 dòng dữ liệu'}
            </span>
          </span>
          <input
            id={inputID}
            type='file'
            accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            className='sr-only'
            onChange={(event) => pick(event.target.files?.[0] ?? null)}
          />
        </label>

        {error && <FormAlert>{error}</FormAlert>}

        {result && (
          <div className='flex flex-col gap-3'>
            <div className='flex items-start gap-2 rounded-sm bg-muted/60 px-3 py-2.5 text-sm'>
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={18}
                strokeWidth={1.75}
                className='mt-px shrink-0'
              />
              <p>
                Đọc {result.totalRows} dòng: tạo được{' '}
                <strong>{result.created.length}</strong> sản phẩm
                {result.errors.length > 0 && (
                  <>
                    , <strong>{result.errors.length}</strong> sản phẩm lỗi bị bỏ
                    qua
                  </>
                )}
                .
              </p>
            </div>
            {result.errors.length > 0 && (
              <ul className='flex flex-col divide-y rounded-sm border text-sm'>
                {result.errors.map((item, index) => (
                  <li key={index} className='px-3 py-2'>
                    <p className='font-medium'>
                      Dòng {item.rows.join(', ')}
                      {item.product && (
                        <span className='font-normal text-muted-foreground'>
                          {' '}
                          · {item.product}
                        </span>
                      )}
                    </p>
                    <ul className='mt-0.5 list-disc pl-5 text-destructive'>
                      {item.messages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <DialogFooter className='shrink-0 border-t bg-muted/30 px-6 py-4'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-sm'
          onClick={onDone}
        >
          {result ? 'Đóng' : 'Hủy'}
        </Button>
        {!result && (
          <Button
            type='button'
            size='sm'
            className='rounded-sm'
            disabled={!file || !!error || importProducts.isPending}
            onClick={submit}
          >
            {importProducts.isPending ? 'Đang nhập…' : 'Nhập sản phẩm'}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
