import { useEffect, useRef, useState } from 'react';
import { tr } from '../i18n';

export type LatLon = { lat: number; lon: number };

/** Distance en mètres (Haversine). */
export const metersBetween = (a: LatLon, b: LatLon) => {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export const formatDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.max(0, Math.round(m / 10) * 10)} m`);

/** Doit rester aligné sur RideService.ARRIVAL_RADIUS_M côté backend. */
export const ARRIVAL_RADIUS_M = 150;

const MODIFIERS: Record<string, string> = {
  left: 'tournez à gauche', 'slight left': 'tournez légèrement à gauche', 'sharp left': 'tournez franchement à gauche',
  right: 'tournez à droite', 'slight right': 'tournez légèrement à droite', 'sharp right': 'tournez franchement à droite',
  straight: 'continuez tout droit', uturn: 'faites demi-tour',
};

const describe = (step: any): string => {
  const m = step?.maneuver || {};
  const road = step?.name ? tr(' sur {road}', { road: step.name }) : '';
  if (m.type === 'arrive') return tr("vous êtes arrivé à destination");
  if (m.type === 'roundabout' || m.type === 'rotary') return tr('au rond-point, prenez la {n}ᵉ sortie', { n: m.exit || 1 }) + road;
  return tr(MODIFIERS[m.modifier] || 'continuez') + road;
};

/** Guidage vers `target` à partir de la position GPS fournie : itinéraire OSRM, instruction, distances. */
export function useRouteGuidance(position: LatLon | null, target: LatLon | null) {
  const [route, setRoute] = useState<{ distance: number; duration: number; steps: any[] } | null>(null);
  const [traveled, setTraveled] = useState(0);
  const last = useRef<LatLon | null>(null);
  const routed = useRef<{ from: LatLon; at: number; target: string } | null>(null);

  useEffect(() => {
    if (!position) return;
    if (last.current) {
      const d = metersBetween(last.current, position);
      if (d >= 5) setTraveled(t => t + d); // ignore le bruit GPS
    }
    last.current = position;
  }, [position?.lat, position?.lon]);

  useEffect(() => {
    if (!position || !target) return;
    const key = `${target.lat},${target.lon}`;
    const prev = routed.current;
    // recalcul si changement de cible, déplacement de 40 m ou 30 s écoulées
    if (prev && prev.target === key && metersBetween(prev.from, position) < 40 && Date.now() - prev.at < 30000) return;
    routed.current = { from: position, at: Date.now(), target: key };
    fetch(`https://router.project-osrm.org/route/v1/driving/${position.lon},${position.lat};${target.lon},${target.lat}?steps=true&overview=false`)
      .then(r => r.json())
      .then(j => { const r0 = j?.routes?.[0]; if (r0) setRoute({ distance: r0.distance, duration: r0.duration, steps: r0.legs?.[0]?.steps || [] }); })
      .catch(() => { /* hors ligne : distance à vol d'oiseau */ });
  }, [position?.lat, position?.lon, target?.lat, target?.lon]);

  const toTarget = position && target ? metersBetween(position, target) : null;
  const next = route?.steps?.[1];
  const toNext = position && next?.maneuver?.location ? metersBetween(position, { lat: next.maneuver.location[1], lon: next.maneuver.location[0] }) : null;
  const instruction = next ? tr('Dans {distance}, {instruction}', { distance: formatDistance(toNext ?? next.distance), instruction: describe(next) })
    : toTarget !== null && toTarget < 50 ? 'Vous êtes arrivé' : position ? 'Suivez l’itinéraire' : 'Recherche de votre position GPS…';

  return {
    instruction, toTarget, traveled,
    remaining: route?.distance ?? toTarget,
    etaMinutes: route ? Math.max(1, Math.round(route.duration / 60)) : null,
    arrived: toTarget !== null && toTarget <= ARRIVAL_RADIUS_M,
  };
}
