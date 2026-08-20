'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Input } from '@/components/input';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      const response = await api.post('/api/auth/login', data);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('tattoogo_token', data.session?.access_token);
      toast.success('Bem-vindo de volta à elite!');
      router.push('/dashboard');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.erro || 'Erro ao realizar login');
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] px-4">
      <div className="w-full max-w-sm space-y-8 bg-zinc-950 p-8 rounded-2xl border border-zinc-800">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white">TattooGo <span className="text-orange-500">MK</span></h1>
          <p className="text-zinc-500 mt-2 text-sm">Acesse sua conta de elite</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
              {...register('email')}
              error={errors.email?.message}
            />
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
              {...register('password')}
              error={errors.password?.message}
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-3 rounded-lg transition-all active:scale-95 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] disabled:opacity-50"
          >
            {mutation.isPending ? 'Autenticando...' : 'Entrar'}
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
