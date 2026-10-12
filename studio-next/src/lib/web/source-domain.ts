const KNOWN_SOURCE_NAMES: Readonly<Record<string, string>> = {
  cloudharbor: 'CloudHarbor',
  letterloop: 'Letterloop',
  brightsend: 'BrightSend',
};

export function extractSourceDomain(source: string) {
  const trimmed = source.trim();
  if (!trimmed) return null;
  try {
    const hostname = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).hostname.replace(/^www\./, '').toLowerCase();
    return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname) ? hostname : null;
  } catch {
    return null;
  }
}

export function sourceDomain(source: string) {
  return extractSourceDomain(source) ?? source.trim();
}

export function sourceDisplayLabel(source: string) {
  const domain = extractSourceDomain(source) ?? source.trim().toLowerCase();
  const root = domain.split('.')[0];
  return KNOWN_SOURCE_NAMES[root] ?? root.split('-').filter(Boolean).map((part) => part.replace(/^./, (letter) => letter.toUpperCase())).join(' ');
}
