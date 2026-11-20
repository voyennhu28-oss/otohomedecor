import type { Metadata } from 'next';

import { ShippingZonesManager } from '@/features/admin-shipping-zones/components/shipping-zones-manager';

export const instant = false;

export const metadata: Metadata = { title: 'Vùng giao hàng' };

export default function AdminShippingZonesPage() {
  return <ShippingZonesManager />;
}
