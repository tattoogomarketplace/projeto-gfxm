'use client';

import { memo, useId } from 'react';
import { AnimatePresence, motion, type Transition } from 'framer-motion';

/**
 * TATTOOGO MK — "Inline Prefix Illusion" + glifo 3D da maquina de tatuagem.
 *
 * Fonte unica de verdade visual do `@`. Extraido do `SearchBar` para ser
 * reutilizado literalmente pela tela de onboarding de @username, garantindo
 * fisica (spring 3D) e renderizacao sub-pixel IDENTICAS nas duas portas.
 *
 * O `@` deixa de ser um caractere do `<input>` e vira um prefixo visual INLINE
 * renderizado como a "primeira letra" do handle. Ao focar, ele se metamorfoseia
 * na maquina de tatuagem 3D hiper-realista, com zero layout shift (CLS = 0).
 */

/**
 * Física "spring" de alta fidelidade (Opus tier): o morphing `@` -> máquina
 * usa flip 3D no eixo Y com leve overshoot físico (spring), sem bounce
 * exagerado, para um encaixe premium e previsível.
 */
const AT_MORPH: Transition = { type: 'spring', stiffness: 300, damping: 26, mass: 0.9 };
const MACHINE_MORPH: Transition = { type: 'spring', stiffness: 340, damping: 24, mass: 0.9 };

const glyphProps = {
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  className: 'absolute inset-0 h-full w-full',
  style: {
    transformStyle: 'preserve-3d' as const,
    backfaceVisibility: 'hidden' as const,
    willChange: 'transform, opacity',
  },
};

/** Estado de repouso: `@` de luxo com acabamento metálico (zinc/prata). */
export function AtGlyph() {
  const uid = useId().replace(/:/g, '');
  const metal = `at-metal-${uid}`;
  return (
    <motion.svg
      {...glyphProps}
      aria-hidden
      initial={{ opacity: 0, rotateY: -90, scale: 0.8 }}
      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
      exit={{ opacity: 0, rotateY: 90, scale: 0.8 }}
      transition={AT_MORPH}
    >
      <defs>
        <linearGradient id={metal} x1="6" y1="4" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="40%" stopColor="#d4d4d8" />
          <stop offset="62%" stopColor="#7c7c85" />
          <stop offset="100%" stopColor="#52525b" />
        </linearGradient>
      </defs>
      <g
        stroke={`url(#${metal})`}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3.6" />
        <path d="M15.6 12v1.4a2.4 2.4 0 0 0 4.8 0V12" />
      </g>
    </motion.svg>
  );
}

/**
 * Estado de foco: máquina de tatuagem hiper-realista. Formas detalhadas com
 * gradientes internos metálicos (zinc/prata), reflexos especulares e sombra
 * interna nas bobinas para simular profundidade 3D real (qualidade Awwwards).
 */
export function MachineGlyph({ onLocked }: { onLocked?: () => void }) {
  const uid = useId().replace(/:/g, '');
  const metal = `tm-metal-${uid}`;
  const coil = `tm-coil-${uid}`;
  const needle = `tm-needle-${uid}`;
  return (
    <motion.svg
      {...glyphProps}
      aria-hidden
      initial={{ opacity: 0, rotateY: 90, scale: 0.8 }}
      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
      exit={{ opacity: 0, rotateY: -90, scale: 0.8 }}
      transition={MACHINE_MORPH}
      onAnimationComplete={onLocked}
      style={{
        ...glyphProps.style,
        filter:
          'drop-shadow(0 0 8px rgba(249,115,22,0.8)) drop-shadow(0 0 20px rgba(249,115,22,0.4))',
      }}
    >
      <defs>
        <linearGradient id={metal} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="28%" stopColor="#d4d4d8" />
          <stop offset="50%" stopColor="#71717a" />
          <stop offset="70%" stopColor="#e4e4e7" />
          <stop offset="100%" stopColor="#3f3f46" />
        </linearGradient>
        <linearGradient id={coil} x1="0" y1="7.5" x2="0" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f4f4f5" />
          <stop offset="42%" stopColor="#a1a1aa" />
          <stop offset="100%" stopColor="#3f3f46" />
        </linearGradient>
        <linearGradient id={needle} x1="0" y1="19" x2="0" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>

      {/* Barra de armadura superior + parafuso de contato */}
      <rect x="8.9" y="1.5" width="6.2" height="2.4" rx="0.9" fill={`url(#${metal})`} />
      <rect x="10.9" y="0.6" width="2.2" height="1.4" rx="0.5" fill={`url(#${metal})`} />

      {/* Postes de ligação (binding posts) */}
      <rect x="8.2" y="3.5" width="1.9" height="2.3" rx="0.6" fill={`url(#${metal})`} />
      <rect x="13.9" y="3.5" width="1.9" height="2.3" rx="0.6" fill={`url(#${metal})`} />

      {/* Poste de ligação lateral */}
      <rect x="3.5" y="8.5" width="2.5" height="4.7" rx="0.9" fill={`url(#${metal})`} />
      <rect x="4.4" y="9.6" width="0.6" height="2.6" rx="0.3" fill="#27272a" opacity="0.55" />

      {/* Bobinas (coils) com profundidade e reflexo especular */}
      <circle cx="9.7" cy="10.7" r="3.15" fill={`url(#${coil})`} />
      <circle cx="14.3" cy="10.7" r="3.15" fill={`url(#${coil})`} />
      <circle cx="9.7" cy="10.7" r="1.55" fill="#18181b" opacity="0.55" />
      <circle cx="14.3" cy="10.7" r="1.55" fill="#18181b" opacity="0.55" />
      <circle cx="9.15" cy="9.85" r="0.7" fill="#fafafa" opacity="0.55" />
      <circle cx="13.75" cy="9.85" r="0.7" fill="#fafafa" opacity="0.55" />

      {/* Enrolamentos das bobinas */}
      <path
        d="M7 9.3c1.4-.9 3-.9 4.4 0M6.7 11.5c1.5-.9 3.2-.9 4.7 0"
        stroke="#71717a"
        strokeWidth="0.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M11.9 9.3c1.4-.9 3-.9 4.4 0M12.2 11.5c1.5-.9 3.2-.9 4.7 0"
        stroke="#71717a"
        strokeWidth="0.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Núcleo central da armadura */}
      <rect x="11.15" y="7.4" width="1.7" height="6.8" rx="0.5" fill={`url(#${metal})`} />

      {/* Ponte do chassi */}
      <path
        d="M6 10.7h1.2M16.8 10.7H18"
        stroke={`url(#${metal})`}
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* Grip / tubo da agulha */}
      <rect x="10.1" y="13.7" width="3.8" height="1" rx="0.5" fill={`url(#${metal})`} />
      <rect x="10.45" y="14" width="3.1" height="5.5" rx="1.1" fill={`url(#${metal})`} />
      <rect x="11.25" y="14.7" width="0.55" height="4.1" rx="0.28" fill="#fafafa" opacity="0.32" />

      {/* Ponta da agulha com brilho da marca */}
      <path d="M12 19.35 12.75 22.9h-1.5z" fill={`url(#${needle})`} />
    </motion.svg>
  );
}

/**
 * Glifo mágico INLINE: ocupa o lugar do caractere `@` como se fosse a primeira
 * letra da string. `@` em repouso e máquina de tatuagem 3D ao focar. Vive num
 * contêiner de tamanho FIXO e imutável (`h-6 w-6 shrink-0`) com perspectiva
 * própria, garantindo que o texto e o caret a sua direita nunca se desloquem
 * (CLS = 0 absoluto). Tocar no glifo foca o input com o caret logo apos o `@`.
 */
export const UsernameMorphGlyph = memo(function UsernameMorphGlyph({
  focused,
  onLocked,
  onActivate,
}: {
  focused: boolean;
  onLocked?: () => void;
  onActivate?: (event: React.MouseEvent) => void;
}) {
  return (
    <span
      aria-hidden
      onMouseDown={onActivate}
      style={{ perspective: 640 }}
      className="relative flex h-6 w-6 shrink-0 cursor-text items-center justify-center transform-gpu contain-paint"
    >
      <AnimatePresence initial={false} mode="sync">
        {focused ? <MachineGlyph key="machine" onLocked={onLocked} /> : <AtGlyph key="at" />}
      </AnimatePresence>
    </span>
  );
});
