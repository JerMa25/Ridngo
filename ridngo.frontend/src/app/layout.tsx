import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { NavbarWrapper } from "@/components/layout/NavbarWrapper";
import { AppBackground } from "@/components/layout/AppBackground";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#FF8C00",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "RidnGo - Transport Liberté en Afrique",
  description: "Fixez votre propre prix pour vos courses et voyages.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RidnGo",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Balise pour forcer l'installation sur certains navigateurs */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AppBackground /> 
          <NavbarWrapper />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}