export const TAB_SWR = {
  staleTime: 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnWindowFocus: false as const,
  refetchOnReconnect: true as const,
  refetchOnMount: 'always' as const,
  networkMode: 'offlineFirst' as const,
  retry: 1,
};
