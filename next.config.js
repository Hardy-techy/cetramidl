/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    reactRoot: true,
  },
}

module.exports = nextConfig
