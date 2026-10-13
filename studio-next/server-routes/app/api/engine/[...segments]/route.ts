import { handleGatewayRequest } from '@/lib/server/gateway';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ segments: string[] }> };

async function handle(request: Request, context: Context): Promise<Response> {
  const { segments } = await context.params;
  return handleGatewayRequest(request, segments);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
