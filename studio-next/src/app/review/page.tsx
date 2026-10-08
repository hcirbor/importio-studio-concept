import { Eyebrow } from '@/components/design-system';
import { ReviewInbox } from '@/components/review-inbox';

export const metadata = { title: 'Review' };
export default function ReviewPage() { return <div className="page"><header className="page-head"><Eyebrow>Operate</Eyebrow><h1>Review inbox</h1><p>Everything needing a human decision, in one queue.</p></header><ReviewInbox /></div>; }
