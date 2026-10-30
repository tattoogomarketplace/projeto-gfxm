import { z } from 'zod';

export const MEDIA_FILTERS = ['photo', 'all', 'video'] as const;

export type MediaFilter = (typeof MEDIA_FILTERS)[number];

export const mediaFilterSchema = z.enum(MEDIA_FILTERS);

export const DEFAULT_MEDIA_FILTER: MediaFilter = 'photo';
