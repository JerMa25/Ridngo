// Palette alignée sur le web (ridngo-frontend/src/app/globals.css)
export const LightColors = {
  orange: '#FF8C00',
  orangeLight: '#FFA333',
  orangeDark: '#CC7000',
  orangeBg: 'rgba(255, 140, 0, 0.12)',

  dark: '#FAF3DD',
  darkCard: '#FFFFFF',
  darkBorder: 'rgba(27,38,59,0.12)',

  white: '#1B263B',
  offWhite: '#1B263B',

  text: '#1B263B',
  textSecondary: 'rgba(27,38,59,0.6)',
  textMuted: 'rgba(27,38,59,0.4)',

  green: '#16A34A',
  greenBg: 'rgba(22, 163, 74, 0.1)',
  red: '#DC2626',
  redBg: 'rgba(220, 38, 38, 0.1)',
  blue: '#2563EB',

  card: '#FFFFFF',
  cardBorder: 'rgba(27,38,59,0.1)',

  input: 'rgba(27,38,59,0.05)',
  inputBorder: 'rgba(27,38,59,0.12)',
  inputFocus: '#FF8C00',

  background: '#FAF3DD',
  statusBar: 'dark' as 'dark' | 'light',
};

export const DarkColors = {
  orange: '#FF8C00',
  orangeLight: '#FFA333',
  orangeDark: '#CC7000',
  orangeBg: 'rgba(255, 140, 0, 0.1)',

  dark: '#1B263B',
  darkCard: '#22304A',
  darkBorder: '#2E3D58',

  white: '#FFFFFF',
  offWhite: '#FAF3DD',

  text: '#FAF3DD',
  textSecondary: 'rgba(250,243,221,0.6)',
  textMuted: 'rgba(250,243,221,0.35)',

  green: '#22C55E',
  greenBg: 'rgba(34, 197, 94, 0.1)',
  red: '#EF4444',
  redBg: 'rgba(239, 68, 68, 0.1)',
  blue: '#3B82F6',

  card: '#22304A',
  cardBorder: 'rgba(255,255,255,0.1)',

  input: 'rgba(255,255,255,0.05)',
  inputBorder: 'rgba(255,255,255,0.1)',
  inputFocus: '#FF8C00',

  background: '#1B263B',
  statusBar: 'light' as 'dark' | 'light',
};

// Default export for backward compat — will be overridden by context
export const Colors = DarkColors;

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const Radius = {
  sm: 8, md: 16, lg: 24, xl: 32, full: 9999,
};