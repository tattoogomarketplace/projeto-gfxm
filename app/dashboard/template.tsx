export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="screen-fade-in flex h-full min-h-0 w-full flex-col transition-opacity duration-300 ease-in-out">
      {children}
    </div>
  );
}
