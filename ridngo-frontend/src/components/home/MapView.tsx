/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useEffect, useRef, useState } from 'react';
import NavigooMap from 'navigoo';

// ─────────────────────────────────────────────
// CONSTANTES POI (Idem Mobile)
// ─────────────────────────────────────────────
const POI_LOCAUX = [
  { nom: "Dispensaire Messassi", latitude: 3.9463, longitude: 11.5221 },
  { nom: "Hôpital Central de Yaoundé", latitude: 3.8681, longitude: 11.5135 },
  { nom: "Hôpital Gynéco-Obstétrique (Ngousso)", latitude: 3.9015, longitude: 11.5401 },
  { nom: "CHU de Yaoundé", latitude: 3.8628, longitude: 11.4961 },
  { nom: "Hôpital Jamot", latitude: 3.8824, longitude: 11.5303 },
  { nom: "Hôpital de District de Djoungolo", latitude: 3.8817, longitude: 11.5225 },
  { nom: "Monument de la Réunification", latitude: 3.8506, longitude: 11.5131 },
  { nom: "Musée National du Cameroun", latitude: 3.8633, longitude: 11.5175 },
  { nom: "Palais des Congrès de Yaoundé", latitude: 3.8936, longitude: 11.5039 },
  { nom: "Stade Ahmadou Ahidjo (Omnisports)", latitude: 3.8847, longitude: 11.5414 },
  { nom: "Palais Polyvalent des Sports (Warda)", latitude: 3.8739, longitude: 11.5119 },
  { nom: "Complexe Sportif d'Olembe", latitude: 3.9514, longitude: 11.5369 },
  { nom: "Parcours Vita", latitude: 3.9031, longitude: 11.4965 },
  { nom: "Université de Yaoundé I (Ngoa-Ekellé)", latitude: 3.8595, longitude: 11.5002 },
  { nom: "Université de Yaoundé II (Soa)", latitude: 3.9833, longitude: 11.6000 },
  { nom: "Hôtel de Ville de Yaoundé", latitude: 3.8617, longitude: 11.5208 },
  { nom: "Palais de l'Unité (Présidence)", latitude: 3.8961, longitude: 11.5136 },
  { nom: "Gare Voyageurs de Yaoundé (Camrail)", latitude: 3.8689, longitude: 11.5244 },
  { nom: "Aéroport de Yaoundé-Ville", latitude: 3.8364, longitude: 11.5208 },
  { nom: "Marché Central", latitude: 3.8647, longitude: 11.5233 },
  { nom: "Marché Mokolo", latitude: 3.8725, longitude: 11.4981 },
  { nom: "Carrefour Mvog Mbi", latitude: 3.8512, longitude: 11.5219 },
  { nom: "Carrefour Coron", latitude: 3.8471, longitude: 11.5207 },
  { nom: "Carrefour Bastos", latitude: 3.8945, longitude: 11.5112 },
  { nom: "Carrefour Obili", latitude: 3.8614, longitude: 11.4915 },
  { nom: "Carrefour Biyem-Assi", latitude: 3.8415, longitude: 11.4884 },
  { nom: "Bastos (Ambassades)", latitude: 3.8967, longitude: 11.5125 },
  { nom: "Biyem-Assi", latitude: 3.8392, longitude: 11.4851 },
  { nom: "Etoudi (Quartier Présidence)", latitude: 3.9156, longitude: 11.5292 },
  { nom: "Nsam", latitude: 3.8292, longitude: 11.5090 },
  { nom: "Messassi (Sortie Nord)", latitude: 3.9463, longitude: 11.5221 },
  { nom: "Essos", latitude: 3.8735, longitude: 11.5365 },
  { nom: "Mimboman", latitude: 3.8658, longitude: 11.5512 },
  { nom: "Rond-point Poste Centrale", latitude: 3.8641, longitude: 11.5195 },
  { nom: "Carrefour Carrière", latitude: 3.8852, longitude: 11.4919 },
];

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

  // --- 1.5. LOGIQUE POI (Intégration Mobile -> Web) ---
  useEffect(() => {
    if (!isMapReady || !mapInstance.current || !mapInstance.current.map) return;
    
    // Importation dynamique de leaflet côté client
    let L: any;
    try {
      L = require('leaflet');
    } catch (e) {
      console.warn("Leaflet non disponible pour les POI");
      return;
    }

    const map = mapInstance.current.map;
    const poiMarkers: any[] = [];

    const poiIcon = L.divIcon({
      html: '<div style="width:12px;height:12px;border-radius:3px;background:#8B5CF6;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.6);"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      className: ''
    });

    POI_LOCAUX.forEach(poi => {
      try {
        const marker = L.marker([poi.latitude, poi.longitude], { icon: poiIcon })
          .bindPopup(`<b>${poi.nom}</b>`)
          .addTo(map);
        poiMarkers.push(marker);
      } catch (e) {}
    });

    return () => {
      poiMarkers.forEach(m => {
        try { m.remove(); } catch (e) {}
      });
    };
  }, [isMapReady]);

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