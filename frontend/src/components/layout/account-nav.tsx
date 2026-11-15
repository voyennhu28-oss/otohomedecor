import Link from "next/link";

const ITEMS = [
  { href: "/account", label: "Thông tin tài khoản" },
  { href: "/account/orders", label: "Đơn hàng" },
  { href: "/account/addresses", label: "Sổ địa chỉ" },
  { href: "/account/wishlist", label: "Yêu thích" },
];

export function AccountNav() {
  return (
    <nav className="flex flex-col gap-2 text-sm">
      {ITEMS.map((item) => (
        <Link key={item.href} href={item.href} className="hover:underline">
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
