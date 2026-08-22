import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Agar Next.js 15+ hai toh yeh bhi daalo (optional)
  serverExternalPackages: [],
  
  // Experimental features (agar zaroorat ho)
  experimental: {
    // serverActions: true, // Agar server actions use kar rahe ho
  },
};

export default nextConfig;