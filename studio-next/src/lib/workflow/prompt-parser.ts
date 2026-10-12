import { canonicalFieldName } from '@/lib/workflow/fields';
import { extractSourceDomain } from '@/lib/web/source-domain';

type InferredWorkflowType = 'compare' | 'research' | 'extract' | 'collect' | 'discover' | 'monitor';

const WORKFLOW_PRECEDENCE: ReadonlyArray<{ template: InferredWorkflowType; pattern: RegExp }> = [
  { template: 'monitor', pattern: /\b(?:watch|monitor|changes?)\b/i },
  { template: 'collect', pattern: /\b(?:catalogue|catalog|pagination)\b/i },
  { template: 'research', pattern: /\b(?:pricing|compare)\b/i },
  { template: 'extract', pattern: /\b(?:single|one|this)\s+(?:web\s+)?page\b/i },
];

function fieldsFromPrompt(request: string) {
  const candidates: string[][] = [];
  const pattern = /\b(?:return|extract|collect)\b\s+([^.;!?]+)/gi;
  for (const match of request.matchAll(pattern)) {
    const phrase = match[1].trim();
    const parts = phrase.split(/,|\band\b/i).map((part) => part.trim()).filter(Boolean);
    const names = parts.map(canonicalFieldName).filter(Boolean);
    const listLike = /,|\band\b/i.test(phrase);
    if (names.length > 1 || (names.length === 1 && (!listLike || parts.length === 1))) candidates.push(names);
  }
  return candidates.sort((left, right) => right.length - left.length)[0] ?? [];
}

export function parsePromptSpecification(request: string) {
  const domains = Array.from(new Set((request.match(/\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}\b/gi) ?? [])
    .map((value) => extractSourceDomain(value))
    .filter((value): value is string => Boolean(value))));
  return { domains, fields: Array.from(new Set(fieldsFromPrompt(request))) };
}

export function inferWorkflowTemplate(request: string): InferredWorkflowType | null {
  const match = WORKFLOW_PRECEDENCE.find((candidate) => candidate.pattern.test(request));
  if (match) return match.template;
  const domains = parsePromptSpecification(request).domains;
  if (domains.length === 1 && (/\bpage\b/i.test(request) || /https?:\/\//i.test(request))) return 'extract';
  return null;
}
