import type { Metadata } from "next";

export const metadata: Metadata = { title: "Khách hàng" };

export default function AdminCustomersPage() {
  return (
    <section className="container mx-auto px-6 py-16">
      <h1 className="text-5xl uppercase">Khách hàng</h1>
      <p className="mt-4 text-muted-foreground">GET /admin/users.</p>
    </section>
  );
}
