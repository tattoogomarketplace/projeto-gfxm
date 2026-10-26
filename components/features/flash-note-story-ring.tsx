'use client';

import type { ReactNode } from 'react';
import {
  buildFlashNoteRingSegments,
  FLASH_NOTE_RING_SIZE,
  FLASH_NOTE_RING_STROKE,
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
  const segments = buildFlashNoteRingSegments({
    count: segmentCount,
    viewed: viewedFlags,
    radius,
    strokeWidth,
  });

  return (
    <span
      className={cn(
        'relative flex items-center justify-center overflow-visible',
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        aria-hidden
        viewBox={`0 0 ${size} ${size}`}
        className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
      >
        {segments.map((segment) => (
          <circle
            key={segment.index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeLinecap={segmentCount > 1 ? 'round' : 'butt'}
            strokeDasharray={segment.dashArray}
            strokeDashoffset={segment.dashOffset}
          />
        ))}
      </svg>
      <span
        className="relative flex items-center justify-center overflow-hidden rounded-full border border-white bg-[#1a1a1a] dark:border-[#0a0a0a]"
        style={{
          width: size - strokeWidth * 2 - 2,
          height: size - strokeWidth * 2 - 2,
        }}
      >
        {children}
      </span>
    </span>
  );
}
