import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212] px-4">
      <SignIn routing="path" path="/login" signUpUrl="/register" />
    </div>
  );
}
