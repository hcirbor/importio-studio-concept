import { handleSmokeRequest } from '@/lib/server/gateway';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return handleSmokeRequest(request);
}
