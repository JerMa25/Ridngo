import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RidnGo Africa',
    short_name: 'RidnGo',
    description: 'Le transport urbain à prix négocié en Afrique.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF3DD',
    theme_color: '#FF8C00',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/background-mobile.jpeg', // Utilise une image existante pour le test
        sizes: '1080x1920',
        type: 'image/jpeg',
        form_factor: 'narrow', // Pour mobile
      },
      {
        src: '/background-desktop.jpeg',
        sizes: '1920x1080',
        type: 'image/jpeg',
        form_factor: 'wide', // Pour desktop
      },
    ],
  };
}