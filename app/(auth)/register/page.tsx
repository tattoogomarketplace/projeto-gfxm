import { SignUp } from '@clerk/nextjs';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212] px-4">
      <SignUp routing="path" path="/register" signInUrl="/login" />
    </div>
  );
}
