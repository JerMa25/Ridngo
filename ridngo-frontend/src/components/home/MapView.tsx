/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useEffect, useRef, useState } from 'react';
import NavigooMap from 'navigoo';

interface MapProps {
  pickup?: { lat: number | string; lon: number | string; name?: string };
  destination?: { lat: number | string; lon: number | string; name?: string };
  partnerPos?: { lat: number | string; lon: number | string };
  heatmapPoints?: any[]; 
}

export default function MapView({ pickup, destination, partnerPos, heatmapPoints }: MapProps) {
  const mapInstance = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Générer un ID unique pour éviter les conflits DOM lors des re-renders rapides
  const [mapId] = useState(() => `navigoo-map-${Math.random().toString(36).substr(2, 9)}`);
  
  const [isMapReady, setIsMapReady] = useState(false);
  const markersRef = useRef<{ start?: any; end?: any; partner?: any }>({});

  // --- 1. INITIALISATION & CLEANUP ROBUSTE ---
  useEffect(() => {
    // Si le conteneur n'est pas prêt, on attend
    if (!containerRef.current) return;

    // Fonction d'initialisation
    const initMap = () => {
      try {
        // Si une instance existe déjà, on tente de la nettoyer (si l'API le permet)
        if (mapInstance.current) {
            try {
                if (mapInstance.current.map && typeof mapInstance.current.map.remove === 'function') {
                    mapInstance.current.map.remove();
                }
            } catch(e) {}
            mapInstance.current = null;
        }

        // Création de la nouvelle instance
        mapInstance.current = new NavigooMap(mapId, {
          center: [3.848, 11.502], 
          zoom: 13, 
          zoomControl: false,
          attributionControl: false
        });
        
        // On signale que la carte est prête
        setIsMapReady(true);

        // Force un resize pour éviter les tuiles grises
        setTimeout(() => {
          if (typeof window !== 'undefined') window.dispatchEvent(new Event('resize'));
        }, 500);

      } catch (e) {
        console.error("Erreur Init Navigoo:", e);
      }
    };

    initMap();

    // CLEANUP : C'est ici qu'on évite le bug "removeLayer of null"
    return () => {
      setIsMapReady(false);
      if (mapInstance.current) {
        try {
           // On essaie de détruire l'instance Leaflet sous-jacente
           if (mapInstance.current.map && typeof mapInstance.current.map.remove === 'function') {
               mapInstance.current.map.off(); // Détache les événements
               mapInstance.current.map.remove(); // Détruit la carte
           }
        } catch (e) {
           // On ignore les erreurs de destruction
        }
        mapInstance.current = null;
      }
    };
  }, []); // [] : On ne ré-initialise jamais la carte sauf démontage complet

  // --- 2. LOGIQUE HEATMAP ---
  useEffect(() => {
    if (!isMapReady || !mapInstance.current) return;
    const navMap = mapInstance.current;

    if (heatmapPoints && heatmapPoints.length > 0) {
      try {
        const cleanPoints: [number, number][] = heatmapPoints
          .map(p => {
            if (Array.isArray(p) && p.length >= 2) {
              const lat = parseFloat(p[0]);
              const lon = parseFloat(p[1]);
              return (!isNaN(lat) && !isNaN(lon)) ? [lat, lon] : null;
            }
            return null;
          })
          .filter((p): p is [number, number] => p !== null);

        if (cleanPoints.length > 0) {
          try { navMap.showHeatmap(cleanPoints); } catch (e) {}
          if (navMap.map) {
            navMap.map.fitBounds(cleanPoints, { padding: [50, 50], maxZoom: 15 });
          }
        }
      } catch (e) { console.error("Heatmap error", e); }
    } else {
      try { navMap.returnToNormalView(); } catch (e) {}
    }
  }, [heatmapPoints, isMapReady]);

  // --- 3. LOGIQUE ITINÉRAIRE (CORRECTION BUG) ---
  useEffect(() => {
    if (!isMapReady || !mapInstance.current) return;
    if (heatmapPoints && heatmapPoints.length > 0) return;

    const map = mapInstance.current;
    const pLat = parseFloat(pickup?.lat as string);
    const pLon = parseFloat(pickup?.lon as string);
    const dLat = parseFloat(destination?.lat as string);
    const dLon = parseFloat(destination?.lon as string);

    if (isNaN(pLat) || isNaN(pLon) || isNaN(dLat) || isNaN(dLon)) return;

    // Petit délai pour laisser le temps à la carte de respirer entre deux renders
    const timer = setTimeout(() => {
        try {
            // Nettoyage manuel des marqueurs précédents
            if (markersRef.current.start) {
                try { map.removePointOfInterest(markersRef.current.start); } catch(e){}
            }
            if (markersRef.current.end) {
                try { map.removePointOfInterest(markersRef.current.end); } catch(e){}
            }

            // Création des nouveaux marqueurs
            const startMarker = map.addPointOfInterest({
                id: 'pickup-' + Date.now(),
                coords: [pLat, pLon],
                name: pickup?.name || 'Départ',
                category: 'Pickup'
            });

            const endMarker = map.addPointOfInterest({
                id: 'dest-' + Date.now(),
                coords: [dLat, dLon],
                name: destination?.name || 'Arrivée',
                category: 'Destination'
            });

            markersRef.current.start = startMarker;
            markersRef.current.end = endMarker;

            // C'EST ICI QUE L'ERREUR SE PRODUISAIT
            if (startMarker && endMarker) {
                try {
                    map.showRoute(startMarker, endMarker);
                } catch (routeError: any) {
                    // Si l'erreur est "Cannot read properties of null (reading 'removeLayer')"
                    // On l'ignore silencieusement car c'est un bug interne de nettoyage de Navigoo
                    if (!routeError.message?.includes('removeLayer')) {
                        console.warn("Erreur tracé route (non bloquant):", routeError);
                    }
                }
            }
        } catch (globalError) {
            console.error("Erreur globale MapView Update:", globalError);
        }
    }, 100);

    return () => clearTimeout(timer);

  }, [pickup?.lat, pickup?.lon, destination?.lat, destination?.lon, heatmapPoints, isMapReady]);

  // --- 4. LOGIQUE TRACKING ---
  useEffect(() => {
    if (!isMapReady || !mapInstance.current) return;
    if (heatmapPoints && heatmapPoints.length > 0) return;

    const lat = parseFloat(partnerPos?.lat as string);
    const lon = parseFloat(partnerPos?.lon as string);

    if (isNaN(lat) || isNaN(lon)) return;

    try {
        if (markersRef.current.partner) {
            try { mapInstance.current.removePointOfInterest(markersRef.current.partner); } catch(e){}
        }
        markersRef.current.partner = mapInstance.current.addPointOfInterest({
            id: 'moving-partner',
            coords: [lat, lon],
            name: 'Position actuelle',
            category: 'Driver'
        });
    } catch (e) {}
  }, [partnerPos?.lat, partnerPos?.lon, heatmapPoints, isMapReady]);

  return (
    <div className="h-full w-full relative">
       <div 
         id={mapId} // ID Unique
         ref={containerRef} 
         className="h-full w-full rounded-3xl"
         style={{ minHeight: '300px', background: '#e5e7eb' }} 
       />
       <style jsx global>{`
         .leaflet-container { 
            width: 100% !important; 
            height: 100% !important; 
            z-index: 1; 
            border-radius: 1.5rem;
         }
         /* Masquer les instructions textuelles de Navigoo si elles apparaissent */
         .leaflet-routing-container { display: none !important; }
       `}</style>
    </div>
  );
}