'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type BannerState = 'online' | 'offline' | 'back-online';

export function OfflineBanner() {
  const [status, setStatus] = useState<BannerState>('online');

  useEffect(() => {
    // État initial
    if (!navigator.onLine) setStatus('offline');

    const handleOffline = () => setStatus('offline');

    const handleOnline = () => {
      // Affiche "Connexion rétablie" pendant 3 secondes avant de disparaître
      setStatus('back-online');
      setTimeout(() => setStatus('online'), 3000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {status !== 'online' && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`fixed top-0 left-0 w-full z-[100] p-3 flex items-center justify-center gap-3 text-sm font-bold shadow-lg backdrop-blur-md ${
            status === 'offline'
              ? 'bg-orange-500/90 text-white'
              : 'bg-green-500/90 text-white'
          }`}
        >
          {status === 'offline' ? (
            <>
              <WifiOff size={18} className="animate-pulse" />
              <span>Mode hors-ligne</span>
            </>
          ) : (
            <>
              <Wifi size={18} />
              <span>Connexion rétablie</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
