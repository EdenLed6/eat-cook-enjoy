/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    typedRoutes: false,
  },
  transpilePackages: [
    '@eat/agent-core',
    '@eat/db',
    '@eat/nutrition',
    '@eat/shared',
    '@eat/vision',
  ],
};

export default nextConfig;
