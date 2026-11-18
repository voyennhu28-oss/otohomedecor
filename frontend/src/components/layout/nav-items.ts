import {
  FavouriteIcon,
  Location01Icon,
  PackageIcon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';

export const SHOP_NAV = [
  { href: '/products', label: 'Sản phẩm' },
  { href: '/about', label: 'Giới thiệu' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Liên hệ' },
] as const;

/** Trang khách hàng: dùng ở dropdown tài khoản trên header, menu mobile và AccountNav. */
export const ACCOUNT_NAV = [
  { href: '/account', label: 'Thông tin tài khoản', icon: UserCircleIcon },
  { href: '/account/orders', label: 'Đơn hàng', icon: PackageIcon },
  { href: '/account/addresses', label: 'Sổ địa chỉ', icon: Location01Icon },
  { href: '/account/wishlist', label: 'Yêu thích', icon: FavouriteIcon },
] as const;
