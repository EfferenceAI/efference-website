import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ['error', 'warn'], // Keep error and warn logs
    } : false,
  },
  
  webpack: (config, { isServer }) => {
    // Handle PDF.js worker files
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
      };
    }
    
    // Handle PDF.js modules
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext][query]'
      }
    });

    return config;
  },
};

export default nextConfig;
