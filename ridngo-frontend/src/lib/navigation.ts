"use client"
import { useEffect, useRef, useState } from 'react';
import { rideService } from './rideService';

export type LatLon = { lat: number; lon: number };

/** Distance en mètres (Haversine). */
export const metersBetween = (a: LatLon, b: LatLon) => {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const MODIFIERS: Record<string, string> = {
  left: 'tournez à gauche', 'slight left': 'tournez légèrement à gauche', 'sharp left': 'tournez franchement à gauche',
  right: 'tournez à droite', 'slight right': 'tournez légèrement à droite', 'sharp right': 'tournez franchement à droite',
  straight: 'continuez tout droit', uturn: 'faites demi-tour',
};

/** Instruction OSRM → texte français (« tournez à gauche sur Rue X »). */
const describe = (step: any): string => {
  const m = step?.maneuver || {};
  const road = step?.name ? ` sur ${step.name}` : '';
  if (m.type === 'arrive') return 'vous êtes arrivé à destination';
  if (m.type === 'roundabout' || m.type === 'rotary') return `au rond-point, prenez la ${m.exit || 1}ᵉ sortie${road}`;
  return `${MODIFIERS[m.modifier] || 'continuez'}${road}`;
};

export const formatDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.max(0, Math.round(m / 10) * 10)} m`);

/**
 * Guidage du chauffeur vers `target` : position GPS réelle (envoyée au backend toutes les 5 s),
 * itinéraire OSRM (OpenStreetMap), prochaine instruction, distances restante et parcourue.
 */
export function useNavigation(target: LatLon | null, active: boolean) {
  const [position, setPosition] = useState<LatLon | null>(null);
  const [geoError, setGeoError] = useState('');
  const [route, setRoute] = useState<{ distance: number; duration: number; steps: any[] } | null>(null);
  const [traveled, setTraveled] = useState(0);
  const last = useRef<LatLon | null>(null);
  const lastRouted = useRef<{ from: LatLon; at: number } | null>(null);

  // Position réelle + distance parcourue (on ignore le bruit GPS < 5 m)
  useEffect(() => {
    if (!active) return;
    if (!navigator.geolocation) { setGeoError("La géolocalisation n'est pas disponible sur cet appareil."); return; }
    const id = navigator.geolocation.watchPosition(
      p => {
        const here = { lat: p.coords.latitude, lon: p.coords.longitude };
        if (last.current) {
          const d = metersBetween(last.current, here);
          if (d >= 5) setTraveled(t => t + d);
        }
        last.current = here;
        setPosition(here);
        setGeoError('');
      },
      e => setGeoError(e.code === 1 ? 'Autorisez la localisation pour être guidé et terminer la course.' : 'Position GPS indisponible.'),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);

  // Envoi de la position au backend (suivi passager + contrôle d'arrivée)
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => { if (last.current) rideService.updateLocation(last.current.lat, last.current.lon); }, 5000);
    return () => clearInterval(id);
  }, [active]);

  // Itinéraire recalculé si on a bougé de 40 m ou toutes les 30 s
  useEffect(() => {
    if (!active || !position || !target) return;
    const prev = lastRouted.current;
    if (prev && metersBetween(prev.from, position) < 40 && Date.now() - prev.at < 30000) return;
    lastRouted.current = { from: position, at: Date.now() };
    const url = `https://router.project-osrm.org/route/v1/driving/${position.lon},${position.lat};${target.lon},${target.lat}?steps=true&overview=false`;
    fetch(url).then(r => r.json()).then(j => {
      const r0 = j?.routes?.[0];
      if (r0) setRoute({ distance: r0.distance, duration: r0.duration, steps: r0.legs?.[0]?.steps || [] });
    }).catch(() => { /* hors ligne : on garde la distance à vol d'oiseau */ });
  }, [active, position, target]);

  const straight = position && target ? metersBetween(position, target) : null;
  const next = route?.steps?.[1];
  const toNext = position && next?.maneuver?.location ? metersBetween(position, { lat: next.maneuver.location[1], lon: next.maneuver.location[0] }) : null;
  const instruction = next ? `Dans ${formatDistance(toNext ?? next.distance)}, ${describe(next)}` : straight !== null && straight < 50 ? 'Vous êtes arrivé' : 'Suivez l’itinéraire';

  return {
    position, geoError, instruction,
    remaining: route?.distance ?? straight,
    etaMinutes: route ? Math.max(1, Math.round(route.duration / 60)) : null,
    toTarget: straight, traveled,
  };
}
