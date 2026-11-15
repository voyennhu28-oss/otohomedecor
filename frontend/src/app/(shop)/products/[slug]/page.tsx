import type { Metadata } from "next";

export const metadata: Metadata = { title: "Chi tiết sản phẩm" };

export default function ProductDetailPage() {
  return (
    <section className="container mx-auto px-6 py-16">
  {/* Trang động: khi làm thật thì đọc params bằng `const { x } = await props.params`. cacheComponents đang bật nên phần đọc params / gọi API phải bọc trong <Suspense> hoặc có loading.tsx */}
      <h1 className="text-5xl uppercase">Chi tiết sản phẩm</h1>
      <p className="mt-4 text-muted-foreground">GET /products/:slug (variants, ảnh), /products/:slug/related.</p>
    </section>
  );
}
