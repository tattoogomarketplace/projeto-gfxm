'use client';

import {
  dehydrate,
  hydrate,
  QueryClient,
  QueryClientProvider,
  type DehydratedState,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ToastContainer } from '@/components/ui/toast-container';

const QUERY_CACHE_KEY = 'tattoogo-query-cache-v1';
const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PERSIST_DEBOUNCE_MS = 250;

type PersistedCache = {
  timestamp: number;
  state: DehydratedState;
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,
      },
    },
  });
}

function restorePersistedCache(client: QueryClient) {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(QUERY_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as PersistedCache;
    if (!parsed?.state || Date.now() - parsed.timestamp > PERSIST_MAX_AGE_MS) {
      window.localStorage.removeItem(QUERY_CACHE_KEY);
      return;
    }
    hydrate(client, parsed.state);
  } catch {
    window.localStorage.removeItem(QUERY_CACHE_KEY);
  }
}

function persistCache(client: QueryClient) {
  if (typeof window === 'undefined') return;
  try {
    const state = dehydrate(client, {
      shouldDehydrateQuery: (query) =>
        query.state.status === 'success' && query.state.data !== undefined,
    });
    const payload: PersistedCache = { timestamp: Date.now(), state };
    window.localStorage.setItem(QUERY_CACHE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
    restorePersistedCache(browserQueryClient);
  }
  return browserQueryClient;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient);

  useEffect(() => {
    let timer = 0;
    const schedulePersist = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => persistCache(queryClient), PERSIST_DEBOUNCE_MS);
    };
    schedulePersist();
    const unsubscribe = queryClient.getQueryCache().subscribe(schedulePersist);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer />
    </QueryClientProvider>
  );
}
