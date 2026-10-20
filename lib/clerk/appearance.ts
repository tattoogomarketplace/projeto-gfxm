export const CLERK_DARK_LUXURY_APPEARANCE = {
  layout: {
    logoPlacement: 'none' as const,
    socialButtonsPlacement: 'bottom' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
  variables: {
    colorPrimary: '#f97316',
    colorBackground: 'transparent',
    colorInputBackground: '#18181b',
    colorInputText: '#fafafa',
    colorText: '#fafafa',
    colorTextSecondary: '#a1a1aa',
    colorNeutral: '#a1a1aa',
    colorDanger: '#ef4444',
    colorSuccess: '#10b981',
    borderRadius: '0.5rem',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
  elements: {
    rootBox: {
      width: '100%',
      background: 'transparent',
      boxShadow: 'none',
    },
    cardBox: {
      width: '100%',
      background: 'transparent',
      boxShadow: 'none',
      border: 'none',
    },
    card: {
      background: 'transparent',
      boxShadow: 'none',
      border: 'none',
      padding: '0',
      width: '100%',
    },
    main: {
      background: 'transparent',
      gap: '1.5rem',
    },
    header: { display: 'none' },
    headerTitle: { display: 'none' },
    headerSubtitle: { display: 'none' },
    logoBox: { display: 'none' },
    logoImage: { display: 'none' },
    navbar: { display: 'none' },
    formFieldLabel: {
      color: '#a1a1aa',
      fontSize: '0.875rem',
    },
    formFieldInput: {
      backgroundColor: '#18181b',
      borderColor: '#3f3f46',
      color: '#fafafa',
      height: '3.25rem',
      borderRadius: '0.5rem',
    },
    formFieldInputShowPasswordButton: {
      color: '#a1a1aa',
    },
    formButtonPrimary: {
      backgroundColor: '#f97316',
      color: '#000000',
      fontWeight: '700',
      height: '2.75rem',
      minHeight: '44px',
      borderRadius: '0.5rem',
      boxShadow: '0 0 15px rgba(249,115,22,0.4)',
      textTransform: 'none',
    },
    footer: {
      background: 'transparent',
      backgroundColor: 'transparent',
      boxShadow: 'none',
      border: 'none',
    },
    footerAction: {
      background: 'transparent',
    },
    footerActionText: {
      color: '#71717a',
      fontSize: '0.875rem',
    },
    footerActionLink: {
      color: '#f97316',
      fontWeight: '600',
    },
    identityPreview: {
      backgroundColor: '#18181b',
      borderColor: '#3f3f46',
    },
    identityPreviewText: {
      color: '#fafafa',
    },
    identityPreviewEditButton: {
      color: '#f97316',
    },
    formFieldAction: {
      color: '#f97316',
    },
    alternativeMethodsBlockButton: {
      backgroundColor: '#18181b',
      borderColor: '#3f3f46',
      color: '#fafafa',
    },
    socialButtonsBlockButton: {
      backgroundColor: '#18181b',
      borderColor: '#3f3f46',
      color: '#fafafa',
    },
    dividerLine: {
      backgroundColor: '#27272a',
    },
    dividerText: {
      color: '#71717a',
    },
    otpCodeFieldInput: {
      backgroundColor: '#18181b',
      borderColor: '#3f3f46',
      color: '#fafafa',
    },
    modalBackdrop: {
      backgroundColor: 'rgba(10, 10, 10, 0.92)',
    },
    modalContent: {
      backgroundColor: '#0a0a0a',
    },
  },
} as const;

export const AUTH_SHELL_CLASS =
  'min-h-[100dvh] h-full w-full bg-[#0a0a0a] flex flex-col items-center justify-center p-6 overflow-y-auto overscroll-none text-white';
