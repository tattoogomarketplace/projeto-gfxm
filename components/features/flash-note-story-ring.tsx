'use client';

import type { ReactNode } from 'react';
import {
  buildFlashNoteRingSegments,
  FLASH_NOTE_RING_INNER_GAP,
  FLASH_NOTE_RING_SIZE,
  FLASH_NOTE_RING_STROKE,
  FLASH_NOTE_RING_TRACK,
  FLASH_NOTE_RING_UNVIEWED,
  FLASH_NOTE_RING_VIEWED,
} from '@/lib/flash-note-ring';
import { cn } from '@/lib/utils';

type FlashNoteStoryRingProps = {
  segmentCount: number;
  viewedFlags?: readonly boolean[];
  children: ReactNode;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

export function FlashNoteStoryRing({
  segmentCount,
  viewedFlags,
  children,
  className,
  size = FLASH_NOTE_RING_SIZE,
  strokeWidth = FLASH_NOTE_RING_STROKE,
}: FlashNoteStoryRingProps) {
  const radius = (size - strokeWidth) / 2;
  const well = size - (strokeWidth + FLASH_NOTE_RING_INNER_GAP) * 2;
  const segments = buildFlashNoteRingSegments({
    count: segmentCount,
    viewed: viewedFlags,
    radius,
    strokeWidth,
  });
  const fullyViewed = segments.length > 0 && segments.every((segment) => segment.viewed);
  const glow = fullyViewed ? FLASH_NOTE_RING_VIEWED : FLASH_NOTE_RING_UNVIEWED;

  return (
    <span
      className={cn(
        'relative flex items-center justify-center overflow-visible',
        'transform-gpu will-change-transform [backface-visibility:hidden]',
        className
      )}
      style={{
        width: size,
        height: size,
        transform: 'translateZ(0)',
        contain: 'layout style',
      }}
    >
      <svg
        aria-hidden
        viewBox={`0 0 ${size} ${size}`}
        className="pointer-events-none absolute inset-0 h-full w-full origin-center transform-gpu [backface-visibility:hidden]"
        style={{
          transform: 'translateZ(0) rotate(-90deg)',
          filter: `drop-shadow(0 0 5px ${glow}66)`,
        }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={FLASH_NOTE_RING_TRACK}
          strokeWidth={strokeWidth + 1.5}
        />
        {segments.map((segment) => (
          <circle
            key={segment.index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeLinecap={segment.linecap}
            strokeDasharray={segment.dashArray}
            strokeDashoffset={segment.dashOffset}
            strokeLinejoin="round"
            shapeRendering="geometricPrecision"
            style={{ transition: 'stroke 160ms linear' }}
          />
        ))}
      </svg>
      <span
        className="relative flex items-center justify-center overflow-hidden rounded-full bg-[#121212] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_6px_14px_rgba(0,0,0,0.45)]"
        style={{ width: well, height: well }}
      >
        {children}
      </span>
    </span>
  );
}
