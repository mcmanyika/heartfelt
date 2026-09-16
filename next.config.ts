import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "*.localhost",
    "http://localhost:3000",
    "http://heartfelt.localhost:3000",
  ],
};

export default nextConfig;
