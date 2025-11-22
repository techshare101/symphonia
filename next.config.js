/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': config.resolve.alias['@'] || './app'
    }
    return config
  }
}

module.exports = nextConfig
