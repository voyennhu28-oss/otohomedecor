import Link from "next/link";

const ITEMS = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/admin/categories", label: "Danh mục" },
  { href: "/admin/orders", label: "Đơn hàng" },
  { href: "/admin/customers", label: "Khách hàng" },
  { href: "/admin/promotions", label: "Khuyến mãi" },
  { href: "/admin/reviews", label: "Đánh giá" },
];

export function AdminSidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-1 border-r p-4 text-sm">
      <Link href="/admin" className="mb-4 font-heading text-xl uppercase">
        Quản trị
      </Link>
      {ITEMS.map((item) => (
        <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 hover:bg-muted">
          {item.label}
        </Link>
      ))}
    </aside>
  );
}
