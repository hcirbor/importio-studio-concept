import { WorkspaceEnrichmentDetail } from '@/components/workspace-enrichment-detail';

const knownTitles: Record<string, string> = {
  'supplier-enrichment': 'Supplier enrichment',
  'retailer-domain-match': 'Retailer domain match',
  'new-supplier-enrichment': 'New supplier enrichment',
};

function titleFromSlug(slug: string) {
  return knownTitles[slug] ?? slug.replace(/-\d+$/, '').split('-').filter(Boolean).map((part) => part.replace(/^./, (letter) => letter.toUpperCase())).join(' ');
}

export function generateStaticParams() {
  const seeded = ['supplier-enrichment', 'retailer-domain-match'];
  const defaults = ['new-supplier-enrichment', 'customer-enrichment', 'product-enrichment', 'company-enrichment', 'enrichment'];
  return [...seeded, ...defaults.flatMap((slug) => [slug, ...Array.from({ length: 9 }, (_, index) => `${slug}-${index + 2}`)])].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: titleFromSlug(slug) };
}

export default async function EnrichmentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <WorkspaceEnrichmentDetail enrichmentId={slug} />;
}
