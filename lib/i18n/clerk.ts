import {
  arSA,
  deDE,
  enUS,
  esES,
  frFR,
  hiIN,
  itIT,
  jaJP,
  koKR,
  nlNL,
  plPL,
  ptBR,
  ptPT,
  ruRU,
  trTR,
  zhCN,
} from '@clerk/localizations';
import type { Locale } from '@/lib/i18n/types';

type ClerkLocalization = typeof ptBR;

type EliteCopy = {
  signInCta: string;
  noAccount: string;
  signUpLink: string;
  alreadyElite: string;
  doLogin: string;
};

const ELITE_COPY: Record<Locale, EliteCopy> = {
  'pt-BR': {
    signInCta: 'Entrar',
    noAccount: 'Ainda não faz parte da elite?',
    signUpLink: 'Cadastre-se',
    alreadyElite: 'Já é da elite?',
    doLogin: 'Faça login',
  },
  'pt-PT': {
    signInCta: 'Entrar',
    noAccount: 'Ainda não faz parte da elite?',
    signUpLink: 'Cadastre-se',
    alreadyElite: 'Já é da elite?',
    doLogin: 'Faça login',
  },
  en: {
    signInCta: 'Sign in',
    noAccount: 'Not part of the elite yet?',
    signUpLink: 'Sign up',
    alreadyElite: 'Already part of the elite?',
    doLogin: 'Sign in',
  },
  es: {
    signInCta: 'Entrar',
    noAccount: '¿Aún no formas parte de la élite?',
    signUpLink: 'Regístrate',
    alreadyElite: '¿Ya eres de la élite?',
    doLogin: 'Inicia sesión',
  },
  fr: {
    signInCta: 'Se connecter',
    noAccount: "Pas encore membre de l'élite ?",
    signUpLink: "S'inscrire",
    alreadyElite: "Déjà membre de l'élite ?",
    doLogin: 'Se connecter',
  },
  de: {
    signInCta: 'Anmelden',
    noAccount: 'Noch nicht Teil der Elite?',
    signUpLink: 'Registrieren',
    alreadyElite: 'Schon Teil der Elite?',
    doLogin: 'Anmelden',
  },
  it: {
    signInCta: 'Accedi',
    noAccount: 'Non fai ancora parte dell’élite?',
    signUpLink: 'Registrati',
    alreadyElite: 'Già nell’élite?',
    doLogin: 'Accedi',
  },
  ja: {
    signInCta: 'サインイン',
    noAccount: 'まだエリートではありませんか？',
    signUpLink: '新規登録',
    alreadyElite: 'すでにエリートですか？',
    doLogin: 'ログイン',
  },
  zh: {
    signInCta: '登录',
    noAccount: '还不是精英会员？',
    signUpLink: '注册',
    alreadyElite: '已经是精英会员？',
    doLogin: '登录',
  },
  ko: {
    signInCta: '로그인',
    noAccount: '아직 엘리트가 아니신가요?',
    signUpLink: '가입하기',
    alreadyElite: '이미 엘리트이신가요?',
    doLogin: '로그인',
  },
  ar: {
    signInCta: 'تسجيل الدخول',
    noAccount: 'لست من النخبة بعد؟',
    signUpLink: 'سجّل الآن',
    alreadyElite: 'هل أنت من النخبة بالفعل؟',
    doLogin: 'تسجيل الدخول',
  },
  ru: {
    signInCta: 'Войти',
    noAccount: 'Ещё не в элите?',
    signUpLink: 'Зарегистрироваться',
    alreadyElite: 'Уже в элите?',
    doLogin: 'Войти',
  },
  hi: {
    signInCta: 'साइन इन करें',
    noAccount: 'अभी तक एलीट नहीं हैं?',
    signUpLink: 'साइन अप करें',
    alreadyElite: 'पहले से एलीट हैं?',
    doLogin: 'लॉग इन करें',
  },
  nl: {
    signInCta: 'Inloggen',
    noAccount: 'Nog geen deel van de elite?',
    signUpLink: 'Registreren',
    alreadyElite: 'Al deel van de elite?',
    doLogin: 'Inloggen',
  },
  tr: {
    signInCta: 'Giriş yap',
    noAccount: 'Henüz elitin bir parçası değil misiniz?',
    signUpLink: 'Kaydolun',
    alreadyElite: 'Zaten elit misiniz?',
    doLogin: 'Giriş yap',
  },
  pl: {
    signInCta: 'Zaloguj się',
    noAccount: 'Nie należysz jeszcze do elity?',
    signUpLink: 'Zarejestruj się',
    alreadyElite: 'Należysz już do elity?',
    doLogin: 'Zaloguj się',
  },
};

function withEliteCopy(base: ClerkLocalization, copy: EliteCopy): ClerkLocalization {
  return {
    ...base,
    formButtonPrimary: copy.signInCta,
    signIn: {
      ...base.signIn,
      start: {
        ...base.signIn?.start,
        actionText: copy.noAccount,
        actionLink: copy.signUpLink,
      },
    },
    signUp: {
      ...base.signUp,
      start: {
        ...base.signUp?.start,
        actionText: copy.alreadyElite,
        actionLink: copy.doLogin,
      },
    },
  };
}

const BASE_LOCALIZATIONS: Record<Locale, ClerkLocalization> = {
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  en: enUS,
  es: esES,
  fr: frFR,
  de: deDE,
  it: itIT,
  ja: jaJP,
  zh: zhCN,
  ko: koKR,
  ar: arSA,
  ru: ruRU,
  hi: hiIN,
  nl: nlNL,
  tr: trTR,
  pl: plPL,
};

export const CLERK_LOCALIZATIONS: Record<Locale, ClerkLocalization> = {
  'pt-BR': withEliteCopy(BASE_LOCALIZATIONS['pt-BR'], ELITE_COPY['pt-BR']),
  'pt-PT': withEliteCopy(BASE_LOCALIZATIONS['pt-PT'], ELITE_COPY['pt-PT']),
  en: withEliteCopy(BASE_LOCALIZATIONS.en, ELITE_COPY.en),
  es: withEliteCopy(BASE_LOCALIZATIONS.es, ELITE_COPY.es),
  fr: withEliteCopy(BASE_LOCALIZATIONS.fr, ELITE_COPY.fr),
  de: withEliteCopy(BASE_LOCALIZATIONS.de, ELITE_COPY.de),
  it: withEliteCopy(BASE_LOCALIZATIONS.it, ELITE_COPY.it),
  ja: withEliteCopy(BASE_LOCALIZATIONS.ja, ELITE_COPY.ja),
  zh: withEliteCopy(BASE_LOCALIZATIONS.zh, ELITE_COPY.zh),
  ko: withEliteCopy(BASE_LOCALIZATIONS.ko, ELITE_COPY.ko),
  ar: withEliteCopy(BASE_LOCALIZATIONS.ar, ELITE_COPY.ar),
  ru: withEliteCopy(BASE_LOCALIZATIONS.ru, ELITE_COPY.ru),
  hi: withEliteCopy(BASE_LOCALIZATIONS.hi, ELITE_COPY.hi),
  nl: withEliteCopy(BASE_LOCALIZATIONS.nl, ELITE_COPY.nl),
  tr: withEliteCopy(BASE_LOCALIZATIONS.tr, ELITE_COPY.tr),
  pl: withEliteCopy(BASE_LOCALIZATIONS.pl, ELITE_COPY.pl),
};
