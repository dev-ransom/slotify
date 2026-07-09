import { Header } from "@/components/layout/Header";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <Header minimal={true} />
      <div>{children}</div>
    </div>
  );
}
