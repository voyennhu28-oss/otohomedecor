import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bài viết" };

export default function BlogPostPage() {
  return (
    <section className="container mx-auto px-6 py-16">
  {/* Trang động: khi làm thật thì đọc params bằng `const { x } = await props.params`. cacheComponents đang bật nên phần đọc params / gọi API phải bọc trong <Suspense> hoặc có loading.tsx */}
      <h1 className="text-5xl uppercase">Bài viết</h1>
      <p className="mt-4 text-muted-foreground">Nội dung bài viết.</p>
    </section>
  );
}
