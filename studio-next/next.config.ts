import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ['@importio/design-system'],
  turbopack: {
    root: path.resolve(process.cwd(), '../..'),
  },
};

export default nextConfig;
