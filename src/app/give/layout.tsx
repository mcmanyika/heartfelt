export default function GiveLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col bg-[linear-gradient(180deg,#f7f4ef_0%,#ffffff_45%)]">{children}</div>;
}
