import { Nav } from "@/components/ui/Nav";

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl px-6 py-8">{children}</main>
    </>
  );
}
