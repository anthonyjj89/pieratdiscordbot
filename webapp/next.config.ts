import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    domains: [
      'cdn.discordapp.com',  // Discord avatars
      'media.discordapp.net' // Discord attachments
    ],
  },
  // Strict mode for better development
  reactStrictMode: true,
  // Disable x-powered-by header
  poweredByHeader: false,
  // Enable static optimization
  swcMinify: true,
  // Environment variables that should be available to the client
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  }
};

export default nextConfig;
