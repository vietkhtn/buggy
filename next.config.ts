import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // Disable image optimization for self-hosted simplicity
  images: {
    unoptimized: true,
  },

  // Enable experimental features
  experimental: {
    // Server actions are stable in Next.js 14
  },
};

export default nextConfig;
