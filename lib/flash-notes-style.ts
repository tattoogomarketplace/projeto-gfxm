/**
 * TATTOOGO MK — Flash Note style contract (shared client/server).
 *
 * This module is intentionally free of React / icon imports so it can be
 * consumed by both the client composer and the node route handlers without
 * leaking browser-only code into the server bundle.
 */

export const FLASH_NOTE_MAX_LENGTH = 80;

export type FlashNoteBackgroundId = 'graphite' | 'ember' | 'copper' | 'emerald';
export type FlashNoteFontId = 'sans' | 'serif' | 'mono';
export type FlashNoteAlignId = 'left' | 'center' | 'right';

/** Persisted style payload — mirrors the `flash_notes` columns. */
export type FlashNoteStyle = {
  backgroundId: FlashNoteBackgroundId;
  fontClass: string;
  alignClass: string;
};

export type FlashNoteBackground = {
  id: FlashNoteBackgroundId;
  /** Decorative ring color — brand token. */
  ring: string;
  /** Raw CSS gradient, the bulletproof source of truth for the live surface. */
  css: string;
};

/**
 * Premium dark-luxury surfaces. Each gradient derives from a brand token
 * (graphite #0a0a0a, orange #F97316, copper #D9460E, emerald #10B981).
 */
export const FLASH_NOTE_BACKGROUNDS: FlashNoteBackground[] = [
  {
    id: 'graphite',
    ring: '#3f3f46',
    css: 'linear-gradient(155deg, #131313 0%, #0a0a0a 58%, #1c1c1c 100%)',
  },
  {
    id: 'ember',
    ring: '#F97316',
    css: 'linear-gradient(155deg, #1b0a02 0%, #3d1404 54%, #0a0a0a 100%)',
  },
  {
    id: 'copper',
    ring: '#D9460E',
    css: 'linear-gradient(155deg, #1e0b03 0%, #4b1405 48%, #130705 100%)',
  },
  {
    id: 'emerald',
    ring: '#10B981',
    css: 'linear-gradient(155deg, #03130c 0%, #063a25 54%, #04120c 100%)',
  },
];

export type FlashNoteFont = {
  id: FlashNoteFontId;
  /** Tailwind font-family class applied to the textarea. */
  className: string;
  /** Extra tracking tuned per family for the swatch preview. */
  glyphClass: string;
  /** Human label surfaced while cycling (Instagram-style). */
  label: string;
};

export const FLASH_NOTE_FONTS: FlashNoteFont[] = [
  { id: 'sans', className: 'font-sans', glyphClass: 'font-sans', label: 'Classic' },
  { id: 'serif', className: 'font-serif', glyphClass: 'font-serif', label: 'Editorial' },
  { id: 'mono', className: 'font-mono', glyphClass: 'font-mono tracking-tight', label: 'Neon' },
];

export type FlashNoteAlignment = {
  id: FlashNoteAlignId;
  className: string;
};

export const FLASH_NOTE_ALIGNMENTS: FlashNoteAlignment[] = [
  { id: 'left', className: 'text-left' },
  { id: 'center', className: 'text-center' },
  { id: 'right', className: 'text-right' },
];

export const DEFAULT_FLASH_NOTE_BACKGROUND_ID: FlashNoteBackgroundId = 'graphite';
export const DEFAULT_FLASH_NOTE_FONT_CLASS = FLASH_NOTE_FONTS[0].className;
export const DEFAULT_FLASH_NOTE_ALIGN_CLASS = FLASH_NOTE_ALIGNMENTS[1].className;

export function getFlashNoteBackground(id?: string | null): FlashNoteBackground {
  return FLASH_NOTE_BACKGROUNDS.find((item) => item.id === id) ?? FLASH_NOTE_BACKGROUNDS[0];
}

export function getFlashNoteFontById(id?: string | null): FlashNoteFont {
  return FLASH_NOTE_FONTS.find((item) => item.id === id) ?? FLASH_NOTE_FONTS[0];
}

export function getFlashNoteFontByClass(className?: string | null): FlashNoteFont {
  return FLASH_NOTE_FONTS.find((item) => item.className === className) ?? FLASH_NOTE_FONTS[0];
}

export function getFlashNoteAlignById(id?: string | null): FlashNoteAlignment {
  return FLASH_NOTE_ALIGNMENTS.find((item) => item.id === id) ?? FLASH_NOTE_ALIGNMENTS[1];
}

export function getFlashNoteAlignByClass(className?: string | null): FlashNoteAlignment {
  return FLASH_NOTE_ALIGNMENTS.find((item) => item.className === className) ?? FLASH_NOTE_ALIGNMENTS[1];
}

export function cycleFlashNoteBackground(id: FlashNoteBackgroundId): FlashNoteBackgroundId {
  const index = FLASH_NOTE_BACKGROUNDS.findIndex((item) => item.id === id);
  return FLASH_NOTE_BACKGROUNDS[(index + 1) % FLASH_NOTE_BACKGROUNDS.length].id;
}

export function cycleFlashNoteFont(id: FlashNoteFontId): FlashNoteFontId {
  const index = FLASH_NOTE_FONTS.findIndex((item) => item.id === id);
  return FLASH_NOTE_FONTS[(index + 1) % FLASH_NOTE_FONTS.length].id;
}

export function cycleFlashNoteAlign(id: FlashNoteAlignId): FlashNoteAlignId {
  const index = FLASH_NOTE_ALIGNMENTS.findIndex((item) => item.id === id);
  return FLASH_NOTE_ALIGNMENTS[(index + 1) % FLASH_NOTE_ALIGNMENTS.length].id;
}

/**
 * Coerces any untrusted input into a valid, persisted style. Unknown values
 * fall back to the graphite / Classic / centered defaults.
 */
export function sanitizeFlashNoteStyle(input: {
  backgroundId?: unknown;
  fontClass?: unknown;
  alignClass?: unknown;
}): FlashNoteStyle {
  const background = getFlashNoteBackground(
    typeof input.backgroundId === 'string' ? input.backgroundId : null
  );
  const font = getFlashNoteFontByClass(
    typeof input.fontClass === 'string' ? input.fontClass : null
  );
  const align = getFlashNoteAlignByClass(
    typeof input.alignClass === 'string' ? input.alignClass : null
  );
  return { backgroundId: background.id, fontClass: font.className, alignClass: align.className };
}
