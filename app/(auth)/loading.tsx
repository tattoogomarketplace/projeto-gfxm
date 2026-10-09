import { AuthScreen } from '@/components/layout/auth-screen';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { t } from '@/lib/i18n';

export default function AuthLoading() {
  return (
    <AuthScreen>
      <TattooMachineLoader compact label={t('common.loading')} />
    </AuthScreen>
  );
}
