import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { subscribeConnectivity } from '../services/connectivityBus';

interface NetworkContextType {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  // Passe à true brièvement à chaque fois qu'on retrouve la connexion,
  // pratique pour déclencher une resynchronisation ponctuelle.
  justReconnected: boolean;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  isInternetReachable: true,
  justReconnected: false,
});

export const NetworkProvider = ({ children }: { children: ReactNode }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    let wasOffline = false;
    const markOnline = (online: boolean) => {
      setIsOnline(online);
      if (online && wasOffline) {
        setJustReconnected(true);
        setTimeout(() => setJustReconnected(false), 3000);
      }
      wasOffline = !online;
    };

    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      // `isConnected` = liaison réseau (wifi/data) ; `isInternetReachable` = accès internet réel.
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setIsInternetReachable(state.isInternetReachable);
      markOnline(online);
    });

    // ⚠️ Sur iPhone (Expo Go), NetInfo ne détecte pas toujours le mode avion de façon
    // fiable/immédiate. On complète donc avec un signal "réel" : chaque requête axios
    // qui réussit ou échoue en "Network Error" met à jour l'état directement.
    const unsubscribeBus = subscribeConnectivity(markOnline);

    NetInfo.fetch().then(state => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setIsInternetReachable(state.isInternetReachable);
      setIsOnline(online);
      wasOffline = !online;
    });

    return () => { unsubscribeNetInfo(); unsubscribeBus(); };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline, isInternetReachable, justReconnected }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);