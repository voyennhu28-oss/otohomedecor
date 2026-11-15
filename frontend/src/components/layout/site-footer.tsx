import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container mx-auto grid gap-8 px-6 py-12 text-sm sm:grid-cols-3">
        <p className="font-heading text-2xl uppercase">O The o HomeDecor</p>
        <nav className="flex flex-col gap-2">
          <Link href="/products">Sản phẩm</Link>
          <Link href="/about">Giới thiệu</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/contact">Liên hệ</Link>
        </nav>
        {/* TODO: thông tin liên hệ, mạng xã hội, đăng ký nhận tin */}
      </div>
    </footer>
  );
}
