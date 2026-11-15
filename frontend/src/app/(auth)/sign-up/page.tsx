import type { Metadata } from "next";

export const metadata: Metadata = { title: "Đăng ký" };

export default function SignUpPage() {
  return (
    <section className="container mx-auto px-6 py-16">
      <h1 className="text-5xl uppercase">Đăng ký</h1>
      <p className="mt-4 text-muted-foreground">POST /auth/sign-up.</p>
    </section>
  );
}
