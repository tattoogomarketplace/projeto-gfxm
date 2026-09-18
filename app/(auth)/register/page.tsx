'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { Input } from '@/components/input';
import { createClient } from '@/lib/supabase';
import { TattooOTPVerification } from '@/components/features/tattoo-otp';
import { WelcomeGate } from '@/components/features/welcome-gate';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { PasswordStrengthBar } from '@/components/features/password-strength-bar';
import { RoleSelector, type RegisterRole } from '@/components/features/role-selector';
import { passwordSchema } from '@/lib/utils/password-strength';

const registerSchema = z
  .object({
    nome: z.string().min(2, 'Informe seu nome real'),
    email: z.string().email('E-mail inválido'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
    role: z.enum(['cliente', 'tatuador', 'estudio']),
    cpf: z.string().min(11, 'CPF inválido'),
    dataNascimento: z.string().min(1, 'Data obrigatória'),
    responsavelNome: z.string().optional(),
    responsavelCpf: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

type FaixaEtaria = 'normal' | 'menor_14' | 'menor_18';

function getFaixaEtaria(dataNascimento?: string): FaixaEtaria {
  if (!dataNascimento) return 'normal';
  const birthDate = new Date(dataNascimento);
  if (Number.isNaN(birthDate.getTime())) return 'normal';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  if (age < 14) return 'menor_14';
  if (age < 18) return 'menor_18';
  return 'normal';
}

export default function RegisterPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [emailForVerification, setEmailForVerification] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [userRole, setUserRole] = useState<RegisterRole>('cliente');

  const { register, handleSubmit, control, setValue, formState: { errors, isValid } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      role: 'cliente',
      nome: '',
      email: '',
      password: '',
      confirmPassword: '',
      cpf: '',
      dataNascimento: '',
    },
  });

  const dataNascimento = useWatch({ control, name: 'dataNascimento' });
  const passwordValue = useWatch({ control, name: 'password' }) || '';
  const confirmPasswordValue = useWatch({ control, name: 'confirmPassword' }) || '';
  const roleValue = useWatch({ control, name: 'role' }) || 'cliente';
  const status = getFaixaEtaria(dataNascimento);
  const passwordsMatch = Boolean(passwordValue) && passwordValue === confirmPasswordValue;

  const onSubmit = async (data: RegisterFormValues) => {
    if (!acceptedTerms) {
        toast.error('Você precisa aceitar os termos de uso.');
        return;
    }
    setLoading(true);
    setUserRole(data.role);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: data.role,
            full_name: data.nome,
            nome: data.nome,
            cpf: data.cpf,
            data_nascimento: data.dataNascimento,
          },
        },
      });
      if (authError) throw authError;

      setEmailForVerification(data.email);
      setIsVerifying(true);
      toast.success('Código enviado para seu e-mail!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (token: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: emailForVerification,
        token,
        type: 'signup',
      });

      if (error) throw error;

      const accessToken = data.session?.access_token;
      if (accessToken) {
        localStorage.setItem('tattoogo_token', accessToken);
      }

      setShowWelcome(true);
    } catch (err) {
      toast.error('Código inválido ou expirado.');
      setLoading(false);
      throw err;
    }
  };

  if (showWelcome) {
    return <WelcomeGate role={userRole} />;
  }

  if (isVerifying) {
    return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6 text-white">
        <div className="w-full max-w-md bg-zinc-950 p-8 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md">
          <h2 className="text-2xl font-bold mb-2 text-center">Verificação <span className="text-orange-500">OTP</span></h2>
          <p className="text-zinc-400 text-center mb-8">Digite o código de 8 dígitos enviado para {emailForVerification}</p>
          <TattooOTPVerification onVerify={handleVerifyOtp} userRole={userRole} />
          </div>
            </div>
  );
}

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
          <RoleSelector
            value={roleValue}
            onChange={(role) => {
              setValue('role', role, { shouldValidate: true, shouldDirty: true });
              setUserRole(role);
            }}
          />
          <input type="hidden" {...register('role')} />
          <Input
            label="Nome completo"
            type="text"
            autoComplete="name"
            {...register('nome')}
            className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
            error={errors.nome?.message}
          />
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
            autoComplete="new-password"
            {...register('password')}
            className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
            error={errors.password?.message}
          />
          <PasswordStrengthBar password={passwordValue} />
          <Input
            label="Confirmar senha"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
            error={errors.confirmPassword?.message}
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
            className="bg-zinc-900 border-zinc-800 focus:ring-orange-500 scheme-dark"
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

          <div className="flex items-center gap-2 mt-4">
            <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
            />
            <label htmlFor="terms" className="text-xs text-zinc-400">
                Li e aceito os termos de uso e política de privacidade.
            </label>
          </div>

          <button
            type="submit"
            disabled={status === 'menor_14' || loading || !passwordsMatch || !isValid || !acceptedTerms}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-3 rounded-lg transition-all active:scale-95 disabled:bg-zinc-700 disabled:text-zinc-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
          >
            {loading ? <TattooMachineLoader compact label="Processando" /> : 'Cadastrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Já é da elite? <Link href="/login" className="text-orange-500 hover:underline">Faça login</Link>
        </p>
      </div>
    </div>
  );
}

