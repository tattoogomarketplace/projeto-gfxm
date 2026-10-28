/**
 * Route-level fallback of `/dashboard/*`.
 *
 * O `/dashboard` é só o despachante de papel. Não pinta skeleton próprio para
 * não aparecer uma segunda tela de carregamento; o destino (cliente/tatuador)
 * aplica o loading da Home com a logo já no tamanho e posição corretos.
 */
export default function DashboardLoading() {
  return null;
}
