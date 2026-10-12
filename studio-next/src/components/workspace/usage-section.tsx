'use client';

import { useStudio } from '@/lib/data';
import { PageHead, Status, TablePanel, type TableRow } from './shared';

export function UsageSection() {
  const usage = useStudio((snapshot) => ({
    usageTrend: snapshot.fixtures.usageTrend,
    usageRows: snapshot.fixtures.usageRows,
  }));
  const recentRuns = usage.usageTrend.runs;
  const recentDates = usage.usageTrend.dates;
  const usageRows: TableRow[] = usage.usageRows.map((row) => ({ id: row.id, cells: row.values }));
  return (
    <>
      <PageHead
        group="Reference"
        title="Usage"
        description="Understand activity, limits and estimated cost before workflows become production dependencies."
      />
      <section className="panel usage-spend-banner" aria-label="Monthly spend example">
        <div><span>SPEND THIS MONTH</span><strong>$8.98 estimated</strong><small>Based on $7 per 1,000 queries · $25.00 monthly alert</small></div>
        <div className="spend-progress" role="progressbar" aria-label="$8.98 of $25 monthly alert" aria-valuemin={0} aria-valuemax={25} aria-valuenow={8.98}><span /></div>
        <Status tone="success">Within budget</Status>
      </section>
      <section className="metric-grid">
        <article><small>Runs · 30 days</small><b>1,284</b></article>
        <article><small>Browser minutes</small><b>418</b></article>
        <article><small>Records returned</small><b>92.6k</b></article>
        <article><small>Estimated cost</small><b>$8.98</b></article>
      </section>
      <section className="panel usage-trend" aria-labelledby="usage-trend-title">
        <header><div><h2 id="usage-trend-title">Runs · last 7 days</h2><p><strong>294</strong> total runs</p></div><span><i /> Runs</span></header>
        <div className="usage-bars">
          {recentRuns.map((runs, index) => <div className="usage-bar" key={recentDates[index]}><span style={{height: `${Math.round((runs / 58) * 100)}%`}} role="img" aria-label={`${recentDates[index]}: ${runs} runs`} /><small>{recentDates[index]}</small></div>)}
        </div>
      </section>
      <TablePanel
        title="Usage by workflow"
        headings={['Workflow', 'Runs', 'Records', 'Browser time', 'Estimated cost']}
        rows={usageRows}
      />
    </>
  );
}
