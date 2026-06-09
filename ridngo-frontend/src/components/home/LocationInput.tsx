/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Recherche textuelle classique
  useEffect(() => {
    if (!query || query.length < 3 || isLocating) {
      setSuggestions([]);
      return;
    }
    
    if (query === value) return;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_OSM_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&countrycodes=cm&limit=5&addressdetails=1&accept-language=fr`
        );
        const data = await response.json();
        setSuggestions(data);
        if (onSuggestionsUpdate) onSuggestionsUpdate(data);
        setIsOpen(true);
      } catch (error) {
        console.error("Erreur Geocoding:", error);
      } finally {
        setIsLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [query]); 

  // --- FONCTION DE FORMATAGE D'ADRESSE ---
  // Permet de transformer le JSON complexe de Nominatim en une chaîne courte (ex: Akwa, Douala)
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

  // --- LOGIQUE AUTO-FILL GPS ---
  const handleGPSClick = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      console.log("Position GPS:", latitude, longitude);
      try {
        // Paramètres cruciaux : zoom=18 (précision rue), addressdetails=1 (pour extraire les quartiers)
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_OSM_BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=fr`
        );
        const data = await res.json();
        
        // On utilise notre formateur au lieu du display_name brut
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
      alert("Erreur de localisation. Vérifiez que votre GPS est activé.");
    }, { enableHighAccuracy: true });
  };

  const handleSelect = (item: any) => {
    // Pour les suggestions de recherche, on simplifie aussi si possible
    const name = formatAddress(item.address) || item.display_name.split(',')[0] + ', ' + (item.address?.city || "");
    setQuery(name);
    onSelect({ name: name, lat: item.lat, lon: item.lon });
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
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={onFocus}
        placeholder={placeholder}
        className={`w-full bg-foreground/5 border border-transparent rounded-2xl py-4 pl-12 outline-none focus:ring-2 focus:ring-orange-btn text-foreground font-bold transition-all placeholder:opacity-30 ${showGPS ? 'pr-[110px] sm:pr-[120px]' : 'pr-12'}`}
      />

      {/* BOUTON GPS STYLISÉ */}
      {showGPS && (
        <button 
          type="button"
          onClick={handleGPSClick}
          disabled={isLocating}
          className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl transition-all ${isLocating ? 'text-orange-btn bg-orange-btn/10' : 'text-foreground/40 bg-foreground/5 hover:text-orange-btn hover:bg-orange-btn/10'}`}
          title="Utiliser ma position actuelle"
        >
          <Navigation size={14} className={`shrink-0 ${isLocating ? 'fill-orange-btn' : ''}`} />
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
            {isLocating ? 'Recherche' : 'Localiser'}
          </span>
        </button>
      )}

      {!disableDropdown && (
        <AnimatePresence>
          {isOpen && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-background border border-foreground/10 shadow-2xl rounded-[24px] z-[100] max-h-60 overflow-y-auto no-scrollbar"
            >
              {suggestions.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onMouseDown={() => handleSelect(item)}
                  className="w-full text-left p-4 hover:bg-orange-btn/5 border-b border-foreground/5 last:border-0 flex items-start gap-3 transition-colors group"
                >
                  <MapPin size={16} className="text-foreground/20 mt-0.5 group-hover:text-orange-btn shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-foreground/80 leading-tight">
                      {item.display_name.split(',')[0]}
                    </span>
                    <span className="text-[10px] font-bold opacity-40 truncate">
                      {item.display_name.split(',').slice(1, 3).join(',')}
                    </span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};