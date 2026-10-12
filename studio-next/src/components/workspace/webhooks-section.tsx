'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/design-system';
import { useStudio, can } from '@/lib/data';
import { Feedback, PageHead, PanelHead, SelectField, Status, TablePanel, type TableRow } from './shared';

export function WebhooksSection({ showHeader = true }: { showHeader?: boolean }) {
  const session = useStudio((snapshot) => snapshot.auth.session);
  const webhookFixtures = useStudio((snapshot) => snapshot.fixtures.webhooks);
  const mayManageWebhooks = can(session, 'manage_webhooks');
  const [endpoint, setEndpoint] = useState('https://api.example.com/importio/events');
  const [eventName, setEventName] = useState('Run completed');
  const [secret, setSecret] = useState('Generated after save');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [endpoints, setEndpoints] = useState(webhookFixtures);

  function addWebhook() {
    try {
      const parsed = new URL(endpoint);
      if (parsed.protocol !== 'https:') throw new Error('HTTPS is required');
    } catch {
      setError('Enter a valid public HTTPS endpoint.');
      setMessage('');
      return;
    }

    const generatedSecret = `whsec_demo_${Date.now().toString(36)}`;
    setSecret(generatedSecret);
    setEndpoints((current) => [
      { id: generatedSecret, url: endpoint, events: eventName, health: 'Validating' },
      ...current,
    ]);
    setError('');
    setMessage('Webhook added. Copy the signing secret now; it is shown only for this demo session.');
  }

  function testWebhook(url: string) {
    setEndpoints((current) => current.map((item) => (
      item.url === url ? { ...item, health: 'Healthy' } : item
    )));
    setMessage(`Test delivered to ${url} · 200 OK · signature verified.`);
  }

  const rows: TableRow[] = endpoints.map((item) => ({
    id: item.id,
    cells: [
      <span key="endpoint"><strong>{item.url}</strong><small>{item.events}</small></span>,
      item.events.includes('·') ? '2 events' : '1 event',
      <Status key="health" tone={item.health === 'Healthy' ? 'success' : 'info'}>{item.health}</Status>,
      <Button key="test" variant="secondary" disabled={!mayManageWebhooks} onClick={() => testWebhook(item.url)}>Test</Button>,
    ],
  }));

  return (
    <>
      {showHeader ? <PageHead
        group="Develop"
        title="Webhooks"
        description="Deliver completed runs and meaningful monitor changes to your systems."
      /> : null}
      <Feedback>{message}</Feedback>
      <section className="panel">
        <PanelHead title="Add an endpoint" meta="HMAC-SHA256" />
        <div className="form-grid webhook-form">
          <label>
            ENDPOINT URL
            <Input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} aria-invalid={Boolean(error)} />
          </label>
          <label>
            EVENTS
            <SelectField
              label="Events"
              value={eventName}
              onValueChange={setEventName}
              options={['Run completed', 'Monitor changed', 'Input required'].map((value) => ({ value, label: value }))}
            />
          </label>
          <label>
            SIGNING SECRET
            <Input readOnly value={secret} />
          </label>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="panel-actions webhook-actions">
          <span>Eight bounded retries from 1 minute to 24 hours.</span>
          <Button variant="primary" disabled={!mayManageWebhooks} title={!mayManageWebhooks ? 'Admin access is required to manage webhooks.' : undefined} onClick={addWebhook}>Add webhook</Button>
        </div>
      </section>
      <TablePanel
        title="Endpoints and recent deliveries"
        meta="Live delivery log"
        headings={['Endpoint', 'Events', 'Health', '']}
        rows={rows}
      />
    </>
  );
}
