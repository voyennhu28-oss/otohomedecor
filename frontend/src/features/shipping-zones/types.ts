import type { Province } from '@/constants/shipping';

export type ShippingZone = {
  id: string;
  name: string;
  provinces: Province[];
  baseFee: number;
  baseWeightKg: number;
  feePerKg: number;
  bulkySurcharge: number;
  freeShipThreshold: number | null;
  estimatedDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShippingZoneInput = {
  name: string;
  provinces: Province[];
  baseFee: number;
  baseWeightKg: number;
  feePerKg: number;
  bulkySurcharge?: number;
  freeShipThreshold?: number | null;
  estimatedDays: number;
  isActive?: boolean;
};

export type UpdateShippingZoneInput = Partial<ShippingZoneInput>;
