import Link from 'next/link';
import { Eyebrow } from '@/components/design-system';
import { DatasetReview } from '@/components/dataset-review';

export const metadata = { title: 'Competitor prices' };

export default function CompetitorPricesDatasetPage() {
  return <div className="page"><Link href="/datasets" className="back-link">← Datasets</Link><header className="page-head"><Eyebrow>Dataset</Eyebrow><h1>Competitor prices</h1><p>Version 4 · field-level evidence retained with every supported value.</p></header><DatasetReview /></div>;
}
