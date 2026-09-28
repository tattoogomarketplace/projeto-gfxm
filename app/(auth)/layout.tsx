export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div id="clerk-captcha" style={{ position: 'absolute', top: '-9999px' }} />
      {children}
    </>
  );
}
