import type { NextConfig } from 'next';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

function git(args: string[]) {
  return execFileSync('git', args, { cwd: path.resolve(process.cwd(), '..'), encoding: 'utf8' }).trim();
}

const commit = process.env.GITHUB_SHA ?? git(['rev-parse', 'HEAD']);
const exactTags = process.env.STUDIO_BUILD_TAG ?? git(['tag', '--points-at', commit]).split('\n').find(Boolean);

const nextConfig: NextConfig = {
  output: 'export',
  allowedDevOrigins: ['127.0.0.1'],
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ['@importio/design-system'],
  env: {
    STUDIO_BUILD_COMMIT: commit,
    ...(exactTags ? { STUDIO_BUILD_TAG: exactTags } : {}),
  },
  turbopack: {
    root: path.resolve(process.cwd(), '../..'),
  },
};

export default nextConfig;
