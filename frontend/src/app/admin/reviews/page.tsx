import type { Metadata } from "next";

export const metadata: Metadata = { title: "Đánh giá" };

export default function AdminReviewsPage() {
  return (
    <section className="container mx-auto px-6 py-16">
      <h1 className="text-5xl uppercase">Đánh giá</h1>
      <p className="mt-4 text-muted-foreground">GET /admin/reviews.</p>
    </section>
  );
}
