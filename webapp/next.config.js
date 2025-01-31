/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: [
      'cdn.discordapp.com',
      'media.discordapp.net'
    ],
  },
  reactStrictMode: true,
  poweredByHeader: false,
  swcMinify: true,
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  }
};

module.exports = nextConfig;
