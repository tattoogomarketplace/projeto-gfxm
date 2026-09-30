import { SignUp } from '@clerk/nextjs';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212] px-4 py-8 text-white">
      <div className="w-full max-w-md">
        <SignUp
          routing="hash"
          path="/register"
          signInUrl="/login"
          fallbackRedirectUrl="/dashboard"
          forceRedirectUrl="/dashboard"
          appearance={{
            variables: {
              colorPrimary: '#f97316',
              colorBackground: '#09090b',
              colorInput: '#18181b',
              colorText: '#ffffff',
              colorTextOnPrimaryBackground: '#000000',
              borderRadius: '0.75rem',
            },
            elements: {
              rootBox: 'w-full mx-auto',
              card: 'bg-zinc-950 border border-zinc-800 shadow-2xl',
              headerTitle: 'text-white',
              headerSubtitle: 'text-zinc-400',
              socialButtonsBlockButton: 'bg-zinc-900 border-zinc-800 text-white',
              formFieldInput: 'bg-zinc-900 border-zinc-800 text-white',
              formButtonPrimary:
                'bg-orange-500 hover:bg-orange-600 text-black font-bold shadow-[0_0_15px_rgba(249,115,22,0.3)]',
              footerActionLink: 'text-orange-500 hover:underline',
            },
          }}
        />
      </div>
    </div>
  );
}
