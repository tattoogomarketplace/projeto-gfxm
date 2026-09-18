'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/input';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';
import { createClient } from '@/lib/supabase';
import { TattooOTPVerification } from '@/components/features/tattoo-otp';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { dashboardPathForRole, normalizeAppRole } from '@/lib/utils/auth-redirect';
import { useAuthStore } from '@/hooks/use-auth-store';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);
  const [token, setToken] = useState<string>();
  const [emailForVerification, setEmailForVerification] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginFormValues & { turnstileToken: string }) => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      return data.email;
    },
    onSuccess: (email) => {
      setEmailForVerification(email);
      setIsVerifying(true);
      toast.success('Código de 8 dígitos enviado para o seu e-mail.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao enviar o código.');
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    if (!token) {
      toast.error('Por favor, valide o Turnstile.');
      return;
    }
    mutation.mutate({ ...data, turnstileToken: token });
  };

  const handleVerifyOtp = async (otp: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: emailForVerification,
      token: otp,
      type: 'email',
    });
    if (error) throw error;

    const user = data.user;
    if (!user) throw new Error('Sessão inválida após verificação.');

    const { data: profile } = await supabase
      .from('perfis')
      .select('role, deleted_at')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.deleted_at) {
      await supabase.auth.signOut();
      throw new Error('Esta conta foi desativada.');
    }

    const accessToken = data.session?.access_token;
    if (accessToken) {
      localStorage.setItem('tattoogo_token', accessToken);
    }

    const role = normalizeAppRole(profile?.role || (user.user_metadata?.role as string));
    const fullName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.nome as string) ||
      '';

    setUser({
      id: user.id,
      email: user.email ?? emailForVerification,
      fullName,
    });
    setRole(role);

    toast.success('Bem-vindo de volta à elite!');
    router.push(dashboardPathForRole(role));
    router.refresh();
  };

  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212] px-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white">
              Verificação <span className="text-orange-500">OTP</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Digite o código de 8 dígitos enviado para {emailForVerification}
            </p>
          </div>
          <TattooOTPVerification onVerify={handleVerifyOtp} />
          <button
            type="button"
            onClick={() => {
              setIsVerifying(false);
              setEmailForVerification('');
            }}
            className="w-full text-center text-sm text-zinc-500 hover:text-orange-500"
          >
            Usar outro e-mail
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#121212] px-4">
      <div className="w-full max-w-sm space-y-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white">
            TattooGo <span className="text-orange-500">MK</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">Acesse sua conta de elite</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              className="border-zinc-800 bg-zinc-900 focus:ring-orange-500"
              {...register('email')}
              error={errors.email?.message}
            />
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
              onSuccess={(nextToken) => setToken(nextToken)}
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-lg bg-orange-500 py-3 font-bold text-black transition-all hover:bg-orange-600 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] active:scale-95 disabled:opacity-50"
          >
            {mutation.isPending ? (
              <TattooMachineLoader compact label="Enviando código" />
            ) : (
              'Receber código'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          Ainda não faz parte da elite?{' '}
          <Link href="/register" className="text-orange-500 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
