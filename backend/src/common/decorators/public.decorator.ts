import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Route không cần đăng nhập. Mặc định mọi route đều cần (AuthGuard global). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
