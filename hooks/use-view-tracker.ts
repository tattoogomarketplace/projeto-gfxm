'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { registerViewBatch } from '@/actions/view-actions';

const VISITOR_TOKEN_KEY = 'tg_visitor_token';
const DWELL_MS = 1500;
const FLUSH_MS = 5000;
const MAX_BATCH = 50;
const INTERSECTION_THRESHOLD = 0.5;

const queuedIds = new Set<string>();
const flushedIds = new Set<string>();
const dwellTimers = new Map<string, number>();
const observedNodes = new Map<Element, string>();

let observer: IntersectionObserver | null = null;
let flushTimer: number | null = null;
let flushing = false;

function readVisitorToken(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_TOKEN_KEY);
    if (existing && existing.trim()) return existing.trim();
    const token =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(VISITOR_TOKEN_KEY, token);
    return token;
  } catch {
    return `anon-${Date.now().toString(36)}`;
  }
}

function abortDwell(postId: string) {
  const timer = dwellTimers.get(postId);
  if (timer == null) return;
  window.clearTimeout(timer);
  dwellTimers.delete(postId);
}

function enqueue(postId: string) {
  if (!postId || flushedIds.has(postId) || queuedIds.has(postId)) return;
  queuedIds.add(postId);
  ensureFlusher();
}

async function flushQueue() {
  if (flushing || queuedIds.size === 0) return;
  const batch = Array.from(queuedIds).slice(0, MAX_BATCH);
  batch.forEach((id) => queuedIds.delete(id));
  flushing = true;
  try {
    const result = await registerViewBatch(batch, readVisitorToken());
    if (result.success) {
      batch.forEach((id) => flushedIds.add(id));
      return;
    }
    batch.forEach((id) => {
      if (!flushedIds.has(id)) queuedIds.add(id);
    });
  } catch {
    batch.forEach((id) => {
      if (!flushedIds.has(id)) queuedIds.add(id);
    });
  } finally {
    flushing = false;
  }
}

function ensureFlusher() {
  if (flushTimer != null || typeof window === 'undefined') return;
  flushTimer = window.setInterval(() => {
    void flushQueue();
  }, FLUSH_MS);
}

function handleIntersect(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    const postId = observedNodes.get(entry.target);
    if (!postId || flushedIds.has(postId) || queuedIds.has(postId)) continue;

    const visible =
      entry.isIntersecting && entry.intersectionRatio >= INTERSECTION_THRESHOLD;

    if (!visible) {
      abortDwell(postId);
      continue;
    }

    if (dwellTimers.has(postId)) continue;
    const timer = window.setTimeout(() => {
      dwellTimers.delete(postId);
      enqueue(postId);
    }, DWELL_MS);
    dwellTimers.set(postId, timer);
  }
}

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(handleIntersect, {
      threshold: INTERSECTION_THRESHOLD,
    });
  }
  return observer;
}

export function useViewTracker(postId: string): RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !postId || typeof IntersectionObserver === 'undefined') return;

    const viewObserver = getObserver();
    observedNodes.set(node, postId);
    viewObserver.observe(node);

    return () => {
      abortDwell(postId);
      observedNodes.delete(node);
      viewObserver.unobserve(node);
    };
  }, [postId]);

  return ref;
}
