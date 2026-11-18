export type Role = 'admin' | 'customer';
export type UserStatus = 'active' | 'inactive';

export type User = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  wishlistProductIDs: string[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthResult = {
  user: User;
};
