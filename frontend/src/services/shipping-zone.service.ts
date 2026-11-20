import type {
  ShippingZone,
  ShippingZoneInput,
  UpdateShippingZoneInput,
} from '@/features/shipping-zones/types';
import { api } from '@/lib/api-client';

export const shippingZoneService = {
  adminList: () => api.get<ShippingZone[]>('/admin/shipping-zones'),

  create: (body: ShippingZoneInput) =>
    api.post<ShippingZone>('/admin/shipping-zones', body),

  update: (id: string, body: UpdateShippingZoneInput) =>
    api.patch<ShippingZone>(`/admin/shipping-zones/${id}`, body),

  remove: (id: string) =>
    api.delete<{ id: string }>(`/admin/shipping-zones/${id}`),
};
