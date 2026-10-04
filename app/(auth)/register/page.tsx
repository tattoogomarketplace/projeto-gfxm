'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import { useSignUp } from '@clerk/nextjs/legacy';
import { Input } from '@/components/input';
import { TattooOTPVerification } from '@/components/features/tattoo-otp';
import { WelcomeGate } from '@/components/features/welcome-gate';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { PasswordStrengthBar } from '@/components/features/password-strength-bar';
import { RoleSelector, type RegisterRole } from '@/components/features/role-selector';
import { passwordSchema } from '@/lib/utils/password-strength';
import { formatCpf, isValidCpf, onlyCpfDigits } from '@/lib/utils/cpf';
import { formatCnpj, isValidCnpj, onlyCnpjDigits } from '@/lib/utils/cnpj';
import { dashboardPathForRole, normalizeAppRole } from '@/lib/utils/auth-redirect';
import { getRoleExperience } from '@/lib/content/role-experience';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useRedirectIfAuthenticated } from '@/hooks/use-redirect-if-authenticated';
import api from '@/lib/api';
import { enforceSingleSession } from '@/app/actions/auth-actions';
import { TermsViewerModal } from '@/components/shared/terms-viewer-modal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const registerSchema = z
  .object({
    nome: z.string().min(2, 'Informe seu nome real'),
    email: z.string().email('E-mail inválido'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
    role: z.enum(['cliente', 'tatuador', 'estudio']),
    cpf: z.string().optional(),
    cnpj: z.string().optional(),
    dataNascimento: z.string().min(1, 'Data obrigatória'),
    responsavelNome: z.string().optional(),
    responsavelCpf: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    if (data.role === 'estudio') {
      if (!isValidCnpj(data.cnpj)) {
        ctx.addIssue({
          code: 'custom',
          path: ['cnpj'],
          message: 'CNPJ inválido',
        });
      }
    } else if (!isValidCpf(data.cpf || '')) {
      ctx.addIssue({
        code: 'custom',
        path: ['cpf'],
        message: 'CPF inválido',
      });
    }
    if (data.responsavelCpf && !isValidCpf(data.responsavelCpf)) {
      ctx.addIssue({
        code: 'custom',
        path: ['responsavelCpf'],
        message: 'CPF do responsável inválido',
      });
    }
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

function clerkErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'errors' in err) {
    const errors = (err as { errors?: { longMessage?: string; message?: string; code?: string }[] }).errors;
    const first = errors?.[0];
    const code = (first?.code || '').toLowerCase();
    const msg = (first?.longMessage || first?.message || '').toLowerCase();
    if (code.includes('already') || msg.includes('already registered') || msg.includes('user already')) {
      return 'Este e-mail já está cadastrado.';
    }
    return first?.longMessage || first?.message || 'Erro ao realizar cadastro.';
  }
  if (err instanceof Error) return err.message;
  return 'Erro ao realizar cadastro.';
}

export default function RegisterPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const clerk = useClerk();
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [emailForVerification, setEmailForVerification] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<RegisterRole>('cliente');
  const [forceShow, setForceShow] = useState(false);
  const [machineFailed, setMachineFailed] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const nextPathRef = useRef<string | null>(null);

  useRedirectIfAuthenticated(!isVerifying && !showWelcome && !isActivating && !loading);

  const { register, handleSubmit, control, setValue, reset, formState: { errors, isValid } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      role: 'cliente',
      nome: '',
      email: '',
      password: '',
      confirmPassword: '',
      cpf: '',
      cnpj: '',
      dataNascimento: '',
    },
  });

  const dataNascimento = useWatch({ control, name: 'dataNascimento' });
  const passwordValue = useWatch({ control, name: 'password' }) || '';
  const confirmPasswordValue = useWatch({ control, name: 'confirmPassword' }) || '';
  const roleValue = useWatch({ control, name: 'role' }) || 'cliente';
  const cpfValue = useWatch({ control, name: 'cpf' }) || '';
  const cnpjValue = useWatch({ control, name: 'cnpj' }) || '';
  const status = getFaixaEtaria(dataNascimento);
  const passwordsMatch = Boolean(passwordValue) && passwordValue === confirmPasswordValue;
  const isEstudio = roleValue === 'estudio';
  const documentIsValid = isEstudio ? isValidCnpj(cnpjValue) : isValidCpf(cpfValue);
  const fetchedCnpjRef = useRef('');

  const onSubmit = async (data: RegisterFormValues) => {
    if (!acceptedTerms) {
      toast.error('Você precisa aceitar os termos de uso.');
      return;
    }
    const isStudio = data.role === 'estudio';
    if (isStudio) {
      if (!isValidCnpj(data.cnpj)) {
        toast.error('CNPJ inválido.');
        return;
      }
    } else if (!isValidCpf(data.cpf || '')) {
      toast.error('CPF inválido.');
      return;
    }
    if (!signUp) {
      toast.error('Clerk ainda não está pronto.');
      return;
    }
    setLoading(true);
    setMachineFailed(false);
    setValidationError('');
    setUserRole(data.role);
    const emailNorm = data.email.trim().toLowerCase();
    const cpfDigits = isStudio ? '' : onlyCpfDigits(data.cpf || '');
    const cnpjDigits = isStudio ? onlyCnpjDigits(data.cnpj) : '';
    try {
      setLoadingText('Verificando seus dados...');

      try {
        await api.post(`${API_URL}/api/auth/check-duplicidade`, {
          email: emailNorm,
          ...(cpfDigits ? { cpf: cpfDigits } : {}),
        });
       } catch (dupErr: unknown) {
         console.error(dupErr);
         const axiosErr = dupErr as { response?: { status?: number; data?: { erro?: string } } };
         const statusCode = axiosErr.response?.status;
         const message = axiosErr.response?.data?.erro || 'E-mail ou CPF já cadastrado.';
         if (statusCode === 409 || statusCode === 400) {
           throw new Error(message);
         }
       }

      setLoadingText('Preparando perfil...');
      await signUp.create({
        emailAddress: emailNorm,
        password: data.password,
        unsafeMetadata: {
          role: data.role,
          full_name: data.nome,
          nome: data.nome,
          ...(isStudio ? { cnpj: cnpjDigits } : { cpf: cpfDigits }),
          data_nascimento: data.dataNascimento,
          accepted_terms: acceptedTerms,
          responsavel_nome: data.responsavelNome || '',
          responsavel_cpf: data.responsavelCpf ? onlyCpfDigits(data.responsavelCpf) : '',
        },
      });

      setLoadingText('Gerando segurança...');
      await signUp.prepareVerification({
        strategy: 'email_code',
      });

      setLoadingText('Enviando código...');
      setEmailForVerification(emailNorm);
      setIsVerifying(true);
      toast.success('Código de 6 dígitos enviado para o seu e-mail.');
     } catch (err) {
       console.error(err);
       setMachineFailed(true);
       const clerkMsg = clerkErrorMessage(err);
       setValidationError((prev) => (prev && prev !== 'Erro de validação' ? prev : clerkMsg || 'Erro de validação'));
       toast.error(clerkMsg);
     } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const handleVerifyOtp = async (token: string) => {
    if (!signUp || !setActive) {
      throw new Error('Clerk ainda não está pronto.');
    }
    try {
      const completeSignUp = await signUp.attemptVerification({ strategy: 'email_code', code: token });

      if (completeSignUp.status !== 'complete' || !completeSignUp.createdSessionId) {
        throw new Error('Sessão inválida após verificação.');
      }

      await setActive({
        session: completeSignUp.createdSessionId,
      });
      try {
        await enforceSingleSession(completeSignUp.createdSessionId);
      } catch (err) {
        console.error('Single-session enforcement error:', err);
      }

      const clerkUser = clerk.user;
      const metadata = (clerkUser?.unsafeMetadata || clerkUser?.publicMetadata || {}) as Record<
        string,
        unknown
      >;
      const resolvedRole = normalizeAppRole(
        (metadata.role as string) || userRole
      );

      setUser({
        id: clerkUser?.id || completeSignUp.createdSessionId,
        email: clerkUser?.primaryEmailAddress?.emailAddress ?? emailForVerification,
        fullName:
          (metadata.full_name as string) ||
          (metadata.nome as string) ||
          clerkUser?.fullName ||
          '',
      });
      setRole(resolvedRole);
      nextPathRef.current = dashboardPathForRole(resolvedRole);
      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleResendOtp = async () => {
    if (!signUp) {
      throw new Error('Clerk ainda não está pronto.');
    }
    await signUp.prepareVerification({ strategy: 'email_code' });
  };

  useEffect(() => {
    const timer = setTimeout(() => setForceShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isEstudio) {
      fetchedCnpjRef.current = '';
      return;
    }
    const digits = onlyCnpjDigits(cnpjValue);
    if (digits.length !== 14 || !isValidCnpj(digits) || fetchedCnpjRef.current === digits) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    fetchedCnpjRef.current = digits;

    (async () => {
      try {
        const res = await fetch(`/api/cnpj/${digits}`, { signal: controller.signal });
        const payload = (await res.json().catch(() => ({}))) as {
          sucesso?: boolean;
          nome?: string;
          fantasia?: string | null;
          erro?: string;
        };
        if (cancelled) return;
        if (!res.ok || !payload.sucesso) {
          toast.error(payload.erro || 'CNPJ não encontrado.');
          return;
        }
        const companyName = String(payload.fantasia || payload.nome || '').trim();
        if (companyName) {
          setValue('nome', companyName, { shouldValidate: true, shouldDirty: true });
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        toast.error('Falha ao consultar o CNPJ.');
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isEstudio, cnpjValue, setValue]);

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6 text-white">
      <div
        id="clerk-captcha"
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
      ></div>
      {isActivating ? (
        <div className="flex w-full max-w-md flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center shadow-2xl">
          <TattooMachineLoader label={getRoleExperience(userRole).onboarding.activating} />
        </div>
      ) : !isLoaded && !forceShow ? (
        <TattooMachineLoader compact label="Carregando" />
      ) : showWelcome ? (
        <WelcomeGate role={userRole} />
      ) : isVerifying ? (
        <div className="screen-fade-in w-full max-w-md bg-zinc-950 p-8 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md">
          <h2 className="text-2xl font-bold mb-2 text-center">Verificação <span className="text-orange-500">OTP</span></h2>
          <p className="text-zinc-400 text-center mb-8">Digite o código de 6 dígitos enviado para {emailForVerification}</p>
          <TattooOTPVerification
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
            userRole={userRole}
            onSuccess={() => {
              const nextPath = nextPathRef.current;
              if (!nextPath) return;
              setIsActivating(true);
              try {
                window.location.href = nextPath;
              } catch (err) {
                console.error('Session activation error:', err);
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              setIsVerifying(false);
              setEmailForVerification('');
            }}
            className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-lg border border-zinc-800 text-sm font-semibold text-zinc-400 transition-colors hover:border-orange-500 hover:text-orange-500"
          >
            Voltar
          </button>
        </div>
      ) : (
      <div className="screen-fade-in w-full max-w-md bg-zinc-950 p-8 rounded-2xl border border-zinc-800 shadow-xl">
        <Link
          href="/login"
          className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-orange-500"
        >
          <span aria-hidden="true">&lt;</span>
          Voltar
        </Link>
        <h1 className="text-2xl font-bold mb-6 text-center">Cadastro <span className="text-orange-500">TattooGo MK</span></h1>

        {status === 'menor_14' && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg mb-6 text-sm text-center">
            O TattooGo MK é restrito para maiores de 14 anos.
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit, () => {
            toast.error('Revise os campos do cadastro para continuar.');
          })}
          className="relative space-y-4"
        >
          <RoleSelector
            value={roleValue}
            onChange={(role) => {
              if (role === roleValue) return;
              fetchedCnpjRef.current = '';
              reset({
                role,
                nome: '',
                email: '',
                password: '',
                confirmPassword: '',
                cpf: '',
                cnpj: '',
                dataNascimento: '',
                responsavelNome: '',
                responsavelCpf: '',
              });
              setUserRole(role);
              setMachineFailed(false);
              setValidationError('');
            }}
          />
          <input type="hidden" {...register('role')} />
          <Input
            label="Nome completo"
            type="text"
            autoComplete="name"
            placeholder="Seu nome completo"
            {...register('nome')}
            className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
            error={errors.nome?.message}
          />
          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            {...register('email')}
            className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
            error={errors.email?.message}
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            {...register('password')}
            className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
            error={errors.password?.message}
          />
          <PasswordStrengthBar password={passwordValue} />
          <Input
            label="Confirmar senha"
            type="password"
            autoComplete="new-password"
            placeholder="Repita a senha"
            {...register('confirmPassword')}
            className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
            error={
              errors.confirmPassword?.message ||
              (confirmPasswordValue && !passwordsMatch ? 'As senhas não coincidem' : undefined)
            }
          />
          {isEstudio ? (
            <Input
              label="CNPJ"
              inputMode="numeric"
              autoComplete="off"
              placeholder="00.000.000/0000-00"
              {...register('cnpj', {
                onChange: (e) => {
                  const formatted = formatCnpj(e.target.value);
                  if (e.target.value !== formatted) e.target.value = formatted;
                  setValue('cnpj', formatted, { shouldValidate: true, shouldDirty: true });
                },
              })}
              className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
              error={errors.cnpj?.message}
            />
          ) : (
            <Input
              label="CPF"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              {...register('cpf', {
                onChange: (e) => {
                  const formatted = formatCpf(e.target.value);
                  if (e.target.value !== formatted) e.target.value = formatted;
                  setValue('cpf', formatted, { shouldValidate: true, shouldDirty: true });
                },
              })}
              className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
              error={errors.cpf?.message}
            />
          )}
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
                inputMode="numeric"
                autoComplete="off"
                {...register('responsavelCpf', {
                  onChange: (e) => {
                    const formatted = formatCpf(e.target.value);
                    if (e.target.value !== formatted) e.target.value = formatted;
                    setValue('responsavelCpf', formatted, { shouldValidate: true, shouldDirty: true });
                  },
                })}
                className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
                error={errors.responsavelCpf?.message}
              />
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Declaro, sob as penas da lei, ser o responsável legal pelo menor cadastrado, autorizando o uso da plataforma para fins de orçamento e agendamento. O procedimento físico de tatuagem estará sujeito à validação presencial de documentação conforme legislação estadual vigente.
              </p>
            </div>
          )}

          <div className="mt-4 flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-orange-500"
            />
            <p className="text-xs leading-relaxed text-zinc-400">
              <label htmlFor="terms">Li e concordo com os </label>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(true)}
                className="font-semibold text-orange-500 underline underline-offset-2 transition-colors hover:text-orange-400"
              >
                Termos de Uso e Privacidade
              </button>
            </p>
          </div>

          {machineFailed ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-red-600/40 bg-red-950/30 p-4">
              <TattooMachineLoader compact failed label="Erro de validação" />
              <p className="text-center text-sm font-semibold text-red-400">
                {validationError || 'Erro de validação'}
              </p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={status === 'menor_14' || loading || !passwordsMatch || !isValid || !acceptedTerms || !documentIsValid}
            className="flex min-h-[44px] w-full items-center justify-center bg-orange-500 hover:bg-orange-600 text-black font-bold py-3 rounded-lg transition-all active:scale-95 disabled:bg-zinc-700 disabled:text-zinc-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
          >
            {loading ? (
              <TattooMachineLoader compact label={loadingText || 'Processando'} />
            ) : machineFailed ? (
              <TattooMachineLoader compact failed label="Erro de validação" />
            ) : (
              'Cadastrar'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Já é da elite? <Link href="/login" className="text-orange-500 hover:underline">Faça login</Link>
        </p>
      </div>
      )}
      <TermsViewerModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        closeLabel="Fechar"
      />
    </div>
  );
}
