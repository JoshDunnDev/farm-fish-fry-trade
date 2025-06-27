/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  swcMinify: true,
  experimental: {
    swcMinify: true,
  },
  reactStrictMode: false, // Temporarily disable to test duplicate calls
};

module.exports = nextConfig;
