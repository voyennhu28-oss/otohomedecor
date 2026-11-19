import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export function formatVND(amount: number): string {
  return vndFormatter.format(amount);
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: vi });
}

export function formatDate(iso: string): string {
  return format(new Date(iso), 'dd/MM/yyyy', { locale: vi });
}
