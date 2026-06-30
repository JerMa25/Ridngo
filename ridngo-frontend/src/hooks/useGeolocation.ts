"use client";

import { useState, useEffect } from 'react';
import { reverseGeocode, UserLocation } from '@/utils/geolocation';

export function useGeolocation(enabled: boolean) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocation(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const updatePosition = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (cancelled) return;
          const { latitude, longitude } = position.coords;
          try {
            const label = await reverseGeocode(latitude, longitude);
            if (!cancelled) {
              setLocation({ label, lat: latitude, lon: longitude });
            }
          } catch {
            if (!cancelled) {
              setLocation({
                label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                lat: latitude,
                lon: longitude,
              });
            }
          } finally {
            if (!cancelled) setIsLoading(false);
          }
        },
        () => {
          if (!cancelled) setIsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      );
    };

    setIsLoading(true);
    updatePosition();
    const interval = setInterval(updatePosition, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled]);

  return { location, isLoading };
}
