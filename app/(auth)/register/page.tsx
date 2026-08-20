'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/input';
import { createClient } from '@/lib/supabase';

const registerSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  cpf: z.string().min(11, 'CPF inválido'),
  dataNascimento: z.string().min(1, 'Data obrigatória'),
  responsavelNome: z.string().optional(),
  responsavelCpf: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<'normal' | 'menor_14' | 'menor_18'>('normal');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const dataNascimento = watch('dataNascimento');

  useEffect(() => {
    if (dataNascimento) {
      const birthDate = new Date(dataNascimento);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      
      if (age < 14) setStatus('menor_14');
      else if (age < 18) setStatus('menor_18');
      else setStatus('normal');
    }
  }, [dataNascimento]);

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: 'cliente',
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('perfis')
          .update({
            cpf: data.cpf,
            data_nascimento: data.dataNascimento,
            responsavel_nome: data.responsavelNome,
            responsavel_cpf: data.responsavelCpf,
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        toast.success('Cadastro realizado com sucesso!');
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md bg-zinc-950 p-8 rounded-2xl border border-zinc-800 shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Cadastro <span className="text-orange-500">TattooGo MK</span></h1>
        
        {status === 'menor_14' && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg mb-6 text-sm text-center">
            O TattooGo MK é restrito para maiores de 14 anos.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input 
            label="E-mail" 
            type="email" 
            {...register('email')} 
            className="bg-zinc-900 border-zinc-800 focus:ring-orange-500" 
            error={errors.email?.message} 
          />
          <Input 
            label="Senha" 
            type="password" 
            {...register('password')} 
            className="bg-zinc-900 border-zinc-800 focus:ring-orange-500" 
            error={errors.password?.message} 
          />
          <Input 
            label="CPF" 
            {...register('cpf')} 
            className="bg-zinc-900 border-zinc-800 focus:ring-orange-500" 
            error={errors.cpf?.message} 
          />
          <Input 
            label="Data de Nascimento" 
            type="date" 
            {...register('dataNascimento')} 
            className="bg-zinc-900 border-zinc-800 focus:ring-orange-500 [color-scheme:dark]" 
            error={errors.dataNascimento?.message} 
          />

          {status === 'menor_18' && (
            <div className="space-y-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <Input 
                label="Nome Completo do Responsável Legal" 
                {...register('responsavelNome')} 
                className="bg-zinc-900 border-zinc-800 focus:ring-orange-500" 
                error={errors.responsavelNome?.message}
              />
              <Input 
                label="CPF do Responsável Legal" 
                {...register('responsavelCpf')} 
                className="bg-zinc-900 border-zinc-800 focus:ring-orange-500" 
                error={errors.responsavelCpf?.message}
              />
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Declaro, sob as penas da lei, ser o responsável legal pelo menor cadastrado, autorizando o uso da plataforma para fins de orçamento e agendamento. O procedimento físico de tatuagem estará sujeito à validação presencial de documentação conforme legislação estadual vigente.
              </p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={status === 'menor_14' || loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-3 rounded-lg transition-all active:scale-95 disabled:bg-zinc-700 disabled:text-zinc-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
          >
            {loading ? 'Processando...' : 'Cadastrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Já é da elite? <Link href="/login" className="text-orange-500 hover:underline">Faça login</Link>
        </p>
      </div>
    </div>
  );
}

