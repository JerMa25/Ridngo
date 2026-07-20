/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Navigation, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

// ─────────────────────────────────────────────
// CONSTANTES POI (Idem Mobile)
// ─────────────────────────────────────────────
const POI_LOCAUX: Array<{ nom: string; latitude: number; longitude: number }> = [
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

function normStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

type SuggestionItem =
  | { type: 'poi'; nom: string; latitude: number; longitude: number }
  | { type: 'osm'; display_name: string; address: any; lat: string; lon: string };

interface Props {
  placeholder: string;
  icon: React.ReactNode;
  onSelect: (location: { name: string; lat: string; lon: string }) => void;
  value: string | undefined | null;
  onSuggestionsUpdate?: (suggestions: any[]) => void;
  onFocus?: () => void;
  disableDropdown?: boolean;
  showGPS?: boolean;
}

export const LocationInput = ({ 
  placeholder, icon, onSelect, value, 
  onSuggestionsUpdate, onFocus, 
  disableDropdown = false,
  showGPS = false 
}: Props) => {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }

    if (q === value) return;

    // 1. Filtre instantané POI locaux
    const norm = normStr(q);
    const poiResults: SuggestionItem[] = POI_LOCAUX
      .filter(p => normStr(p.nom).includes(norm))
      .slice(0, 4)
      .map(p => ({ type: 'poi' as const, ...p }));

    setSuggestions(poiResults);
    setIsOpen(true);
    if (onSuggestionsUpdate) onSuggestionsUpdate(poiResults);

    // 2. Fallback Nominatim
    if (q.length >= 3) {
      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_OSM_BASE_URL}/search?format=json&q=${encodeURIComponent(q)},+Yaound%C3%A9&countrycodes=cm&limit=5&addressdetails=1&accept-language=fr`
          );
          const data = await response.json();
          
          const osmItems: SuggestionItem[] = (data as any[])
            .filter((item: any) => {
              const dispNorm = normStr(item.display_name.split(',')[0]);
              return !poiResults.some(p =>
                p.type === 'poi' &&
                (normStr(p.nom).includes(dispNorm) || dispNorm.includes(normStr(p.nom)))
              );
            })
            .slice(0, 5 - poiResults.length)
            .map((item: any) => ({ type: 'osm' as const, ...item }));

          const merged = [...poiResults, ...osmItems];
          setSuggestions(merged);
          if (onSuggestionsUpdate) onSuggestionsUpdate(merged);
        } catch (error) {
          console.error("Erreur Geocoding:", error);
        } finally {
          setIsLoading(false);
        }
      }, 600);
    }
  }, [value, onSuggestionsUpdate]);

  const formatAddress = (addressObj: any) => {
    if (!addressObj) return "";
    const road = addressObj.road || addressObj.pedestrian || addressObj.highway;
    const neighborhood = addressObj.suburb || addressObj.neighbourhood || addressObj.city_district;
    const city = addressObj.city || addressObj.town || addressObj.village;

    const parts = [];
    if (road) parts.push(road);
    if (neighborhood) parts.push(neighborhood);
    if (city && city !== neighborhood) parts.push(city);

    return parts.length > 0 ? parts.join(', ') : "Ma position";
  };

  const handleGPSClick = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_OSM_BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=fr`
        );
        const data = await res.json();
        
        const simplifiedAddress = formatAddress(data.address);
        
        setQuery(simplifiedAddress);
        onSelect({ 
          name: simplifiedAddress, 
          lat: latitude.toString(), 
          lon: longitude.toString() 
        });
        setIsOpen(false);
      } catch (e) {
        console.error("Erreur Reverse Geocoding", e);
      } finally {
        setIsLocating(false);
      }
    }, (error) => {
      setIsLocating(false);
      console.error(error);
      toast.error("Erreur de localisation. Vérifiez que votre GPS est activé.");
    }, { enableHighAccuracy: true });
  };

  const handleSelect = (item: SuggestionItem) => {
    let locName = "";
    let lat = "";
    let lon = "";

    if (item.type === 'poi') {
      locName = item.nom;
      lat = item.latitude.toString();
      lon = item.longitude.toString();
    } else {
      locName = formatAddress(item.address) || item.display_name.split(',')[0] + ', ' + (item.address?.city || "");
      lat = item.lat;
      lon = item.lon;
    }

    setQuery(locName);
    onSelect({ name: locName, lat, lon });
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full group" ref={wrapperRef}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-btn z-10">
        {isLoading || isLocating ? <Loader2 className="animate-spin" size={20} /> : icon}
      </div>
      
      <input
        type="text"
        value={query} 
        onChange={(e) => search(e.target.value)}
        onFocus={() => {
          setIsOpen(true);
          if (onFocus) onFocus();
        }}
        placeholder={placeholder}
        className="w-full bg-foreground/5 border border-transparent rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-2 focus:ring-orange-btn text-foreground font-bold transition-all placeholder:opacity-30"
      />

      {showGPS && (
        <button 
          type="button"
          onClick={handleGPSClick}
          disabled={isLocating}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isLocating ? 'text-orange-btn' : 'text-foreground/20 hover:text-orange-btn hover:bg-orange-btn/10'}`}
          title="Utiliser ma position actuelle"
        >
          <Navigation size={18} className={isLocating ? 'fill-orange-btn' : ''} />
        </button>
      )}

      {!disableDropdown && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-background border border-foreground/10 shadow-2xl rounded-[24px] z-[100] max-h-60 overflow-y-auto no-scrollbar"
            >
              {suggestions.length === 0 && (!query || query.length < 2) ? (
                // Lieux populaires
                <div className="p-2">
                  <div className="px-4 py-2 text-xs font-black uppercase tracking-widest text-foreground/40">
                    📍 Lieux populaires à Yaoundé
                  </div>
                  {POI_LOCAUX.slice(0, 8).map((item, index) => (
                    <button
                      key={`pop-${index}`}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSelect({ type: 'poi', ...item }); }}
                      className="w-full text-left p-3 hover:bg-orange-btn/5 rounded-xl flex items-center gap-3 transition-colors group"
                    >
                      <Star size={16} className="text-yellow-500 fill-yellow-500 shrink-0" />
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-bold text-foreground/80 leading-tight">
                          {item.nom}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                // Résultats de recherche
                <div className="p-2">
                  {suggestions.length > 0 ? suggestions.map((item, index) => {
                    const isPoi = item.type === 'poi';
                    const mainText = isPoi ? item.nom : item.display_name.split(',')[0];
                    const subText = isPoi 
                      ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                      : item.display_name.split(',').slice(1, 3).join(',');

                    return (
                      <button
                        key={`sug-${index}`}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                        className="w-full text-left p-3 hover:bg-orange-btn/5 rounded-xl flex items-center gap-3 transition-colors group"
                      >
                        {isPoi ? (
                          <Star size={16} className="text-yellow-500 fill-yellow-500 shrink-0" />
                        ) : (
                          <MapPin size={16} className="text-foreground/20 group-hover:text-orange-btn shrink-0" />
                        )}
                        
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-bold text-foreground/80 leading-tight truncate">
                            {mainText}
                          </span>
                          <span className="text-[10px] font-bold opacity-40 truncate">
                            {subText}
                          </span>
                        </div>
                        
                        {isPoi && (
                          <div className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 shrink-0">
                            <span className="text-[9px] font-black tracking-widest text-purple-500">POI</span>
                          </div>
                        )}
                      </button>
                    )
                  }) : (query && query.length >= 2 && !isLoading) ? (
                    <div className="p-8 text-center text-foreground/50 text-sm font-bold">
                      Aucun résultat pour "{query}"
                    </div>
                  ) : null}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};