import { ViewportScaleGuard } from '@/components/layout/viewport-scale-guard';

export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <ViewportScaleGuard />
      {children}
    </div>
  );
}
