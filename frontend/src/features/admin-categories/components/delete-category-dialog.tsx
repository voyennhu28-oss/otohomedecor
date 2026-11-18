'use client';

import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteCategory } from '@/features/admin-categories/hooks/use-admin-categories';
import type { AdminCategoryNode } from '@/features/categories/types';
import { useRetainedValue } from '@/hooks/use-retained-value';

type DeleteCategoryDialogProps = {
  category: AdminCategoryNode | null;
  onClose: () => void;
};

export function DeleteCategoryDialog({
  category: categoryProp,
  onClose,
}: DeleteCategoryDialogProps) {
  const remove = useDeleteCategory();
  const category = useRetainedValue(categoryProp);
  const childCount = category?.children.length ?? 0;
  const productCount = category?.productCount ?? 0;
  const blocked = childCount > 0 || productCount > 0;

  return (
    <AlertDialog
      open={categoryProp !== null}
      onOpenChange={(open) => !open && !remove.isPending && onClose()}
    >
      <AlertDialogContent className='rounded-sm'>
        <AlertDialogHeader>
          <AlertDialogTitle className='text-2xl'>
            {blocked ? 'Chưa xóa được danh mục' : 'Xóa danh mục?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {category &&
              (blocked ? (
                <>
                  &quot;{category.name}&quot; còn{' '}
                  {[
                    childCount > 0 && `${childCount} danh mục con`,
                    productCount > 0 && `${productCount} sản phẩm`,
                  ]
                    .filter(Boolean)
                    .join(' và ')}
                  . Hãy chuyển {childCount > 0 ? 'danh mục con' : 'sản phẩm'}{' '}
                  sang danh mục khác trước.
                </>
              ) : (
                <>
                  &quot;{category.name}&quot; sẽ bị xóa khỏi cửa hàng. Bạn có
                  thể tạo lại danh mục cùng slug sau này.
                </>
              ))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size='sm' className='rounded-sm'>
            {blocked ? 'Đóng' : 'Hủy'}
          </AlertDialogCancel>
          {!blocked && (
            <AlertDialogAction
              variant='destructive'
              size='sm'
              className='rounded-sm'
              disabled={remove.isPending}
              onClick={() => {
                if (!category) return;
                remove.mutate(category.id, {
                  onSuccess: () => {
                    toast.success(`Đã xóa danh mục "${category.name}"`);
                    onClose();
                  },
                  onError: (error) => toast.error(error.message),
                });
              }}
            >
              {remove.isPending ? 'Đang xóa…' : 'Xóa danh mục'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
