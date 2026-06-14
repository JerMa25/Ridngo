import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'bleu-nuit': '#1B263B',
        'orange-btn': '#FF8C00',
        'blanc-casse': '#FAF3DD',
      },
      backgroundImage: {
        'hero-pattern': "url('/bg-taxi.jpg')", // Assure-toi d'avoir une image en fond
      },
    },
  },
  plugins: [],
};
export default config;