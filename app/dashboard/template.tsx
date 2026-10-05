export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="screen-fade-in min-h-dvh transition-opacity duration-300 ease-in-out">
      {children}
    </div>
  );
}
