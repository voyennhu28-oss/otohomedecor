import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <Link href="/" className="font-heading text-3xl uppercase">
        Oto Home Decor
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
