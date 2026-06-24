import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@remembrall/core",
    "@remembrall/crypto",
    "@remembrall/export",
    "@remembrall/supabase",
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
