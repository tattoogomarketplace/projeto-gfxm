import { AuthScreen } from '@/components/layout/auth-screen';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';

export default function AuthLoading() {
  return (
    <AuthScreen>
      <TattooMachineLoader compact label="Carregando" />
    </AuthScreen>
  );
}
