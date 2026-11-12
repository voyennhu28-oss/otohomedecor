import { Role, User as UserPrisma, UserStatus } from '@prisma/client';

export class User implements UserPrisma {
  id: string;
  email: string;
  password: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  wishlistProductIDs: string[];
  deletedAt: Date | null;
  createdAt: Date;
  resetPasswordExp: Date | null;
  resetPasswordToken: string | null;
  updatedAt: Date;
}
