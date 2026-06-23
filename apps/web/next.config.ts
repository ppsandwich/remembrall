import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@remembrall/core",
    "@remembrall/crypto",
    "@remembrall/export",
    "@remembrall/supabase",
  ],
};

export default nextConfig;
