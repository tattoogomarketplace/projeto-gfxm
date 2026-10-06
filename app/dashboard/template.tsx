export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col transform-gpu backface-hidden will-change-transform">
      {children}
    </div>
  );
}
