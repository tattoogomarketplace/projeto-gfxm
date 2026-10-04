import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';

export function SessionHydrating({ label = 'Carregando sessão...' }: { label?: string }) {
  return (
    <div className="flex h-screen min-h-dvh items-center justify-center bg-[#121212] px-6 text-center text-white">
      <TattooMachineLoader label={label} />
    </div>
  );
}
