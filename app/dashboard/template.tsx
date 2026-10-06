export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="screen-fade-in w-full transition-opacity duration-300 ease-in-out">
      {children}
    </div>
  );
}
