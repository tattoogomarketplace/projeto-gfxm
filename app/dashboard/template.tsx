export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="screen-fade-in gpu-layer flex h-full min-h-0 w-full transform-gpu flex-col backface-hidden will-change-transform">
      {children}
    </div>
  );
}
