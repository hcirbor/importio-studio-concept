import 'server-only';

export function healthResponse(): Response {
  return Response.json({ status: 'ok' });
}
