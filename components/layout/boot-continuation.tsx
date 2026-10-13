/**
 * Ponte de boot "Seamless".
 *
 * Renderizada pela camada <ClerkLoading> do Root Layout como continuacao estatica
 * e pixel-identica do splash (Deep Graphite preto + bloom de cobre na mesma
 * geometria 50%/42%). Fica cravada entre a saida do splash e a resolucao da
 * sessao do Clerk, garantindo que o WebKit nunca pinte branco nem exponha o
 * layout deslogado (login) durante o thrash de hidratacao.
 *
 * Regra de marca: nenhuma animacao, nenhum texto, nenhum logo. Apenas o canvas
 * escuro da marca — o handoff Splash -> Continuation -> App e imperceptivel.
 *
 * Nao usa a classe `splash-root` porque `html.splash-seen` a ocultaria apos o
 * primeiro boot; queremos a camada ativa em TODA inicializacao fria.
 */
const BOOT_CONTINUATION_BG = '#000000';

export function BootContinuation() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[70] h-[100dvh] w-full overflow-hidden overscroll-none touch-none"
      style={{
        backgroundColor: BOOT_CONTINUATION_BG,
        backgroundImage:
          'radial-gradient(circle at 50% 42%, rgba(217,70,14,0.14) 0%, rgba(26,10,4,0.55) 16%, #000000 46%)',
      }}
    />
  );
}
