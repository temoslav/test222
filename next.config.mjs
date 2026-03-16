/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Allow Server Actions from localhost and the Windsurf browser-preview proxy
    // (which forwards from a random 127.0.0.1 port to the dev server).
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'localhost:3001',
        'localhost:3002',
        '127.0.0.1:3000',
        '127.0.0.1:3001',
        '127.0.0.1:3002',
      ],
    },
  },
  transpilePackages: ['framer-motion'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.kudago.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'http', hostname: '**.kudago.com' },
    ],
  },
};

export default nextConfig;
