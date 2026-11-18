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
  /** Bỏ trống: nhóm không có tiêu đề (mục đứng đầu như "Bảng điều khiển"). */
  label?: string;
  items: AdminNavItem[];
};

/**
 * Menu trang quản trị. Mỗi nhóm nên có từ 2 mục trở lên, tránh nhóm 1 mục làm menu vụn.
 * Breadcrumb trên topbar cũng đọc tên nhóm / trang từ đây.
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
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
    label: 'Hệ thống',
    items: [
      { href: '/admin/users', label: 'Tài khoản', icon: UserGroupIcon },
      {
        href: '/admin/shipping-zones',
        label: 'Vùng giao hàng',
        icon: DeliveryTruck01Icon,
      },
    ],
  },
];

/** `/admin` chỉ active khi đúng trang đó; mục khác active cả ở trang con (`/admin/orders/123`). */
export function isAdminNavActive(href: string, pathname: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

const ADMIN_NAV_ENTRIES = ADMIN_NAV.flatMap((group) =>
  group.items.map((item) => ({ item, group })),
).sort((a, b) => b.item.href.length - a.item.href.length);

/** Mục menu (kèm nhóm) ứng với đường dẫn hiện tại, đường dẫn dài nhất khớp trước. */
export function findAdminNavEntry(pathname: string) {
  return ADMIN_NAV_ENTRIES.find(({ item }) =>
    isAdminNavActive(item.href, pathname),
  );
}
