import { Nav } from "@/components/ui/Nav";

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-[1600px] px-6 py-6">{children}</main>
    </>
  );
}
