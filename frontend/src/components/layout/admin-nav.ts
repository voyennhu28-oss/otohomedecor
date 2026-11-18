import {
  CreditCardIcon,
  DashboardSquare01Icon,
  DeliveryTruck01Icon,
  DiscountTag01Icon,
  Layers01Icon,
  PackageIcon,
  ShoppingBag01Icon,
  StarIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';

export type AdminNavItem = {
  href: string;
  label: string;
  icon: IconSvgElement;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

/**
 * Menu trang quản trị, nhóm theo module backend (docs/api-docs).
 * Breadcrumb trên topbar cũng đọc tên trang từ đây.
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      { href: '/admin', label: 'Bảng điều khiển', icon: DashboardSquare01Icon },
    ],
  },
  {
    label: 'Bán hàng',
    items: [
      { href: '/admin/orders', label: 'Đơn hàng', icon: ShoppingBag01Icon },
      { href: '/admin/payments', label: 'Thanh toán', icon: CreditCardIcon },
      {
        href: '/admin/promotions',
        label: 'Khuyến mãi',
        icon: DiscountTag01Icon,
      },
    ],
  },
  {
    label: 'Sản phẩm',
    items: [
      { href: '/admin/products', label: 'Sản phẩm', icon: PackageIcon },
      { href: '/admin/categories', label: 'Danh mục', icon: Layers01Icon },
      { href: '/admin/reviews', label: 'Đánh giá', icon: StarIcon },
    ],
  },
  {
    label: 'Khách hàng',
    items: [{ href: '/admin/users', label: 'Tài khoản', icon: UserGroupIcon }],
  },
  {
    label: 'Cấu hình',
    items: [
      {
        href: '/admin/shipping-zones',
        label: 'Vùng giao hàng',
        icon: DeliveryTruck01Icon,
      },
    ],
  },
];

const ADMIN_NAV_ITEMS = ADMIN_NAV.flatMap((group) => group.items);

/** `/admin` chỉ active khi đúng trang đó; mục khác active cả ở trang con (`/admin/orders/123`). */
export function isAdminNavActive(href: string, pathname: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Mục menu ứng với đường dẫn hiện tại (dài nhất khớp trước). */
export function findAdminNavItem(pathname: string) {
  return [...ADMIN_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isAdminNavActive(item.href, pathname));
}
