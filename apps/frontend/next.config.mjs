/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    optimizePackageImports: ['zod'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
