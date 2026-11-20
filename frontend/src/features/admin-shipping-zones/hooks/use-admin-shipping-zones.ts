'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpdateShippingZoneInput } from '@/features/shipping-zones/types';
import { shippingZoneService } from '@/services/shipping-zone.service';

export const ADMIN_SHIPPING_ZONES_KEY = ['admin', 'shipping-zones'] as const;

export function useAdminShippingZones() {
  return useQuery({
    queryKey: ADMIN_SHIPPING_ZONES_KEY,
    queryFn: shippingZoneService.adminList,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ADMIN_SHIPPING_ZONES_KEY });
}

export function useCreateShippingZone() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: shippingZoneService.create,
    onSuccess: invalidate,
  });
}

export function useUpdateShippingZone() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateShippingZoneInput }) =>
      shippingZoneService.update(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteShippingZone() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: shippingZoneService.remove,
    onSuccess: invalidate,
  });
}
