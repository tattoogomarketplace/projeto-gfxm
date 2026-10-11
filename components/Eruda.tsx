'use client';

import { useEffect } from 'react';

export function Eruda() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let disposed = false;

    void import('eruda').then((mod) => {
      if (disposed) return;
      const eruda = mod.default;
      if (typeof eruda?.init !== 'function') return;
      eruda.init();
    });

    return () => {
      disposed = true;
    };
  }, []);

  return null;
}

export default Eruda;
