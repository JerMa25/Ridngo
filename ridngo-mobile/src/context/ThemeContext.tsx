import { KEYCHAIN } from '../services/api';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { LightColors, DarkColors } from '../types/theme';
import { tr } from '../i18n';

type ThemeColors = typeof DarkColors;

interface ThemeContextType {
  isDark: boolean;
  Colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState(false); // Light by default

  useEffect(() => {
    SecureStore.getItemAsync('theme').then(val => {
      if (val === 'dark') setIsDark(true);
      else setIsDark(false);
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await SecureStore.setItemAsync('theme', next ? 'dark' : 'light', KEYCHAIN);
  };

  const Colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ isDark, Colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error(tr("useTheme must be used within ThemeProvider"));
  return ctx;
};