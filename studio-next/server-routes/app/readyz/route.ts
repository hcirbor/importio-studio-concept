import { checkUpstreamReadiness } from '@/lib/server/gateway';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const ready = await checkUpstreamReadiness();
  return Response.json({ ready }, { status: ready ? 200 : 503 });
}
