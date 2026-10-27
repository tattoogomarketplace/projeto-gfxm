export const GRID_EAGER_COUNT = 6;

export function hydrateGridItems<T>(
  items: readonly T[] | null | undefined,
  fallback: readonly T[]
): T[] {
  return Array.isArray(items) && items.length > 0 ? items.slice() : fallback.slice();
}

export function isEagerGridIndex(index: number, eagerCount = GRID_EAGER_COUNT): boolean {
  return index < eagerCount;
}
