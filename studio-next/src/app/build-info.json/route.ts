export const dynamic = 'force-static';

export function GET() {
  const tag = process.env.STUDIO_BUILD_TAG;
  return Response.json({
    commit: process.env.STUDIO_BUILD_COMMIT,
    ...(tag ? { tag } : {}),
    builtAt: new Date().toISOString(),
    source: 'mock',
  });
}
