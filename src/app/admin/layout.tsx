import { Nav } from "@/components/ui/Nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
    </>
  );
}
