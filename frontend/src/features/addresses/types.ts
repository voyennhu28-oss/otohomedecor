export type Address = {
  id: string;
  userID: string;
  fullName: string;
  phone: string;
  province: string;
  district: string | null;
  ward: string;
  street: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};
