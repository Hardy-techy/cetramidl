/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: [
    '@midl/bip322-js',
    '@midl/satoshi-kit',
    '@midl/executor-react',
    '@midl/core',
    '@midl/react'
  ]
}

module.exports = nextConfig
