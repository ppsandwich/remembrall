import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@brall/core",
    "@brall/crypto",
    "@brall/export",
    "@brall/supabase",
  ],
  allowedDevOrigins: ["http://192.168.68.90:3000", "https://192.168.68.90:3000"],
  output: "export",
  trailingSlash: true,
  assetPrefix: "./",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
