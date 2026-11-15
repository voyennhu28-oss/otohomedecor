import type { Metadata } from "next";

export const metadata: Metadata = { title: "Danh mục" };

export default function AdminCategoriesPage() {
  return (
    <section className="container mx-auto px-6 py-16">
      <h1 className="text-5xl uppercase">Danh mục</h1>
      <p className="mt-4 text-muted-foreground">CRUD /admin/categories.</p>
    </section>
  );
}
