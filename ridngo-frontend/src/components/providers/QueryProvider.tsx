'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useState, useEffect } from 'react';
import { get, set, del } from 'idb-keyval';
import { Persister } from '@tanstack/react-query-persist-client';

/**
 * Creates an IndexedDB persister to store cache locally
 */
export function createIDBPersister(idbValidKey: IDBValidKey = 'reactQuery') {
  return {
    persistClient: async (client: any) => {
      await set(idbValidKey, client);
    },
    restoreClient: async () => {
      return await get<any>(idbValidKey);
    },
    removeClient: async () => {
      await del(idbValidKey);
    },
  } as Persister;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 60 * 24, // Keep cache garbage collection alive for 24 hours
            staleTime: 1000 * 60 * 2, // Data is fresh for 2 minutes
            retry: 3, // Retry failed requests 3 times
            refetchOnWindowFocus: false, // Prevent spamming API when reconnecting/focusing
          },
        },
      })
  );

  const [persister, setPersister] = useState<Persister | null>(null);

  useEffect(() => {
    // Only initialize IDB on client side (browser)
    if (typeof window !== 'undefined') {
      setPersister(createIDBPersister('ridngo-offline-cache'));
    }
  }, []);

  if (!persister) {
    // Fallback during initial render (SSR)
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
