import { healthResponse } from '@/lib/server/health';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return healthResponse();
}
