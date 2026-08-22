import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Environment variables ko client-side par expose karo
  env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  
  // Agar Next.js 15+ hai toh yeh bhi daalo (optional)
  serverExternalPackages: [],
  
  // Experimental features (agar zaroorat ho)
  experimental: {
    // serverActions: true, // Agar server actions use kar rahe ho
  },
};

export default nextConfig;