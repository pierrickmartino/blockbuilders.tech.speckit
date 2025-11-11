/** @type {import('next').NextConfig} */
const isStorybook = Boolean(globalThis?.process?.env?.STORYBOOK);

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

if (isStorybook) {
  config.typedRoutes = false;
  delete config.experimental?.optimizePackageImports;
}

export default config;
