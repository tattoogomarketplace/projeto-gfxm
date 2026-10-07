/**
 * TATTOOGO MK - RESET DE ESCALA DE VIEWPORT (MOBILE)
 *
 * O Safari do iOS ignora `user-scalable=no` e aplica auto-zoom no visual
 * viewport quando um campo de formulário com fonte computada abaixo de 16px
 * recebe foco. Como o app navega no cliente (SPA), essa escala residual
 * "vazava" de volta para a AppShell (Início, Agenda, Chat e Perfil), deixando
 * a interface ampliada e distorcida ao retornar de submódulos como
 * "Quero ser Tatuador".
 *
 * Este módulo centraliza as primitivas de reset — reafirmação da diretiva de
 * viewport canônica, remoção de artefatos inline de escala/transform e
 * recálculo forçado no WebKit — para uso em qualquer transição de rota.
 */

export const CANONICAL_VIEWPORT =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

// Variante levemente diferente usada apenas para forçar o WebKit a reparsear a
// diretiva de viewport (mudar o valor para o mesmo texto não dispara reflow).
const RECALIBRATION_VIEWPORT =
  'width=device-width, initial-scale=1, maximum-scale=1.0001, user-scalable=no, viewport-fit=cover';

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function isEditingElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return EDITABLE_TAGS.has(element.tagName) || element.isContentEditable;
}

function ensureCanonicalViewportMeta() {
  if (typeof document === 'undefined') return;

  const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="viewport"]'));

  if (metas.length === 0) {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = CANONICAL_VIEWPORT;
    document.head.appendChild(meta);
    return;
  }

  metas.forEach((meta) => {
    if (meta.getAttribute('content') !== CANONICAL_VIEWPORT) {
      meta.setAttribute('content', CANONICAL_VIEWPORT);
    }
  });
}

function clearInlineScale(target: HTMLElement | null) {
  if (!target) return;
  target.style.removeProperty('zoom');
  target.style.removeProperty('transform');
  target.style.removeProperty('-webkit-transform');
}

export interface ResetViewportOptions {
  /**
   * Remove o foco do campo ativo. Deve ser `true` em transições de rota
   * (saída/entrada de tela), mas `false` ao apenas recalibrar durante a
   * digitação para não fechar o teclado.
   */
  forceBlur?: boolean;
}

/**
 * Reafirma a escala nativa (1:1) e o topo de rolagem dos elementos raiz.
 * Não toca em contêineres de scroll internos para não regredir a posição
 * de leitura das abas principais.
 */
export function resetViewportScale(options: ResetViewportOptions = {}) {
  if (typeof document === 'undefined') return;
  const { forceBlur = false } = options;

  ensureCanonicalViewportMeta();

  if (forceBlur || !isEditingElement(document.activeElement)) {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }

  const roots: Array<HTMLElement | null> = [
    document.documentElement,
    document.body,
  ];

  document
    .querySelectorAll<HTMLElement>('.app-frame, .luxury-canvas, .app-scroll, [data-viewport-root]')
    .forEach((node) => roots.push(node));

  roots.forEach(clearInlineScale);

  const scrolling = document.scrollingElement as HTMLElement | null;
  if (scrolling) {
    scrolling.scrollTop = 0;
    scrolling.scrollLeft = 0;
  }
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  if (typeof window !== 'undefined') {
    window.scrollTo(0, 0);
  }
}

/**
 * Força o WebKit a reparsear a diretiva de viewport alternando o conteúdo por
 * um frame. É o gatilho que faz o iOS descartar a escala residual de zoom
 * aplicada ao focar um input.
 */
export function forceViewportRecalibration() {
  if (typeof document === 'undefined') return;

  const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="viewport"]'));
  if (metas.length === 0) return;

  const apply = (content: string) => {
    metas.forEach((meta) => meta.setAttribute('content', content));
  };

  apply(RECALIBRATION_VIEWPORT);
  requestAnimationFrame(() => apply(CANONICAL_VIEWPORT));
}
