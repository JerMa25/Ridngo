import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // swMinify: true,
  disable: false,//process.env.NODE_ENV === "development", // Désactivé en dev pour éviter les conflits Turbopack
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  turbopack: {},
  output: 'standalone',
};

export default withPWA(nextConfig);
