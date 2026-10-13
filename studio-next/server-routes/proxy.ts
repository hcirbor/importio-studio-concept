import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { localAuthBypassEnabled } from '@/lib/server/gateway-config';
import { verifyIapRequest } from '@/lib/server/iap';

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (localAuthBypassEnabled()) return NextResponse.next();
  try {
    await verifyIapRequest(request);
    return NextResponse.next();
  } catch {
    return NextResponse.json({ error: { code: 'unauthenticated', message: 'Authentication required.' } }, { status: 401 });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|healthz|readyz).*)'],
};
