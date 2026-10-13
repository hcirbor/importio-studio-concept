import type { NextConfig } from 'next';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

function git(args: string[]) {
  return execFileSync('git', args, { cwd: path.resolve(process.cwd(), '..'), encoding: 'utf8' }).trim();
}

const externalCommit = process.env.GITHUB_SHA;
const commit = externalCommit ?? git(['rev-parse', 'HEAD']);
const exactTags = process.env.STUDIO_BUILD_TAG
  ?? (externalCommit ? undefined : git(['tag', '--points-at', commit]).split('\n').find(Boolean));
const dirty = externalCommit ? false : git(['status', '--porcelain']).length > 0;
const serverBuild = process.env.STUDIO_BUILD_TARGET === 'server';

const nextConfig: NextConfig = {
  output: serverBuild ? 'standalone' : 'export',
  allowedDevOrigins: ['127.0.0.1'],
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ['@importio/design-system'],
  env: {
    STUDIO_BUILD_COMMIT: commit,
    ...(exactTags ? { STUDIO_BUILD_TAG: exactTags } : {}),
    ...(dirty ? { STUDIO_BUILD_DIRTY: 'true' } : {}),
  },
  turbopack: {
    root: path.resolve(process.cwd(), '../..'),
  },
};

export default nextConfig;
