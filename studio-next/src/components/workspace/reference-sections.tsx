'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/design-system';
import {
  Feedback,
  PageHead,
  PanelHead,
  SelectField,
  Status,
  TablePanel,
  type TableRow,
} from './shared';

type WebhookEndpoint = {
  id: string;
  url: string;
  events: string;
  health: 'Healthy' | 'Validating';
};

type ApiKey = {
  id: string;
  name: string;
  display: string;
};

const curlExample = `curl -X POST https://api.import.io/v1/tasks \\
  -H 'Authorization: Bearer $IMPORTIO_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"workflow":"compare","sources":[...]}'`;

const initialWebhookEndpoints: WebhookEndpoint[] = [
  {
    id: 'primary-data-endpoint',
    url: 'https://data.example.com/importio',
    events: 'Run completed · Monitor changed',
    health: 'Healthy',
  },
];

const usageRows: TableRow[] = [
  { id: 'outdoor-catalogue', cells: ['Outdoor catalogue', '742', '81,412', '246 min', '$42.18'] },
  { id: 'competitor-prices', cells: ['Competitor prices', '422', '8,996', '130 min', '$29.62'] },
  { id: 'qualified-suppliers', cells: ['Qualified suppliers', '120', '2,204', '42 min', '$12.40'] },
];

export function DevelopersSection() {
  const [message, setMessage] = useState('');

  async function copyCurl() {
    try {
      await navigator.clipboard.writeText(curlExample);
      setMessage('cURL copied to clipboard.');
    } catch {
      setMessage('Clipboard access is unavailable here. Select the cURL command above to copy it.');
    }
  }

  return (
    <>
      <PageHead group="Reference" title="Developers" description="The same task model through API and MCP." />
      <Feedback>{message}</Feedback>
      <section className="developer-grid">
        <article className="panel">
          <PanelHead title="Task API" meta="POST /v1/tasks" />
          <div className="panel-body">
            <p>Submit a task, keep its ID, and retrieve the result when it is ready.</p>
            <pre className="code-block">{curlExample}</pre>
            <Button variant="secondary" onClick={copyCurl}>Copy cURL</Button>
          </div>
        </article>
        <article className="panel">
          <PanelHead title="MCP quickstart" meta="Free developer entry" />
          <div className="panel-body">
            <p>Search public pages from an MCP client, then move proven workflows into your workspace.</p>
            <pre className="code-block">npx -y @importio/mcp-server{`\n`}# no account required for Search preview</pre>
            <Button
              variant="primary"
              onClick={() => setMessage('MCP setup: run the command above, then add the server to your MCP client.')}
            >
              View MCP setup
            </Button>
          </div>
        </article>
      </section>
    </>
  );
}

export function WebhooksSection() {
  const [endpoint, setEndpoint] = useState('https://api.example.com/importio/events');
  const [eventName, setEventName] = useState('Run completed');
  const [secret, setSecret] = useState('Generated after save');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [endpoints, setEndpoints] = useState(initialWebhookEndpoints);

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
      <Button key="test" variant="secondary" onClick={() => testWebhook(item.url)}>Test</Button>,
    ],
  }));

  return (
    <>
      <PageHead
        group="Reference"
        title="Webhooks"
        description="Deliver completed runs and meaningful monitor changes to your systems."
      />
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
          <Button variant="primary" onClick={addWebhook}>Add webhook</Button>
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

export function UsageSection() {
  return (
    <>
      <PageHead
        group="Reference"
        title="Usage"
        description="Understand activity, limits and estimated cost before workflows become production dependencies."
      />
      <section className="metric-grid">
        <article><small>Runs · 30 days</small><b>1,284</b></article>
        <article><small>Browser minutes</small><b>418</b></article>
        <article><small>Records returned</small><b>92.6k</b></article>
        <article><small>Estimated cost</small><b>$84.20</b></article>
      </section>
      <TablePanel
        title="Usage by workflow"
        headings={['Workflow', 'Runs', 'Records', 'Browser time', 'Estimated cost']}
        rows={usageRows}
      />
    </>
  );
}

export function SettingsSection() {
  const [keys, setKeys] = useState<ApiKey[]>([
    { id: 'production', name: 'Production', display: 'sk_live_••••9f2a · created 14 Sep' },
  ]);
  const [newKey, setNewKey] = useState('');
  const [retention, setRetention] = useState('30 days');
  const [message, setMessage] = useState('');

  function createKey() {
    const value = `sk_live_demo_${Date.now().toString(36)}`;
    setKeys((current) => [
      ...current,
      { id: value, name: 'New key', display: `${value.slice(0, 16)}•••• · created now` },
    ]);
    setNewKey(value);
    setMessage('API key created. Copy it now; it will not be shown again.');
  }

  function revokeKey(key: ApiKey) {
    setKeys((current) => current.filter((item) => item.id !== key.id));
    if (key.id === newKey) setNewKey('');
    setMessage(`${key.name} revoked.`);
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(newKey);
      setMessage('API key copied to clipboard.');
    } catch {
      setMessage('Clipboard access is unavailable here. Select the key above to copy it.');
    }
  }

  return (
    <>
      <PageHead
        group="Reference"
        title="Settings"
        description="Workspace configuration, limits and operational preferences."
      />
      <Feedback>{message}</Feedback>
      {newKey ? (
        <div className="secret-reveal">
          <code>{newKey}</code>
          <Button variant="secondary" size="sm" onClick={copyKey}>Copy key</Button>
        </div>
      ) : null}
      <section className="settings-grid">
        <article className="panel">
          <PanelHead title="API keys" action={<Button variant="primary" onClick={createKey}>Create key</Button>} />
          {keys.length ? keys.map((key) => (
            <div className="settings-row" key={key.id}>
              <span><strong>{key.name}</strong><small>{key.display}</small></span>
              <Button variant="secondary" onClick={() => revokeKey(key)}>Revoke</Button>
            </div>
          )) : (
            <div className="panel-body"><p>No active API keys.</p></div>
          )}
        </article>
        <article className="panel">
          <PanelHead title="Team" meta="View only" />
          <div className="settings-row"><span><strong>Jordan Davis</strong><small>jordan@example.com</small></span><span>Owner</span></div>
          <div className="settings-row"><span><strong>Maya Chen</strong><small>maya@example.com</small></span><span>Editor</span></div>
        </article>
        <article className="panel">
          <PanelHead title="Data handling" />
          <div className="panel-body">
            <label>
              DEFAULT RETENTION
              <SelectField
                label="Default retention"
                value={retention}
                onValueChange={(value) => {
                  setRetention(value);
                  setMessage(`Default retention updated to ${value}.`);
                }}
                options={['30 days', '90 days', '1 year'].map((value) => ({ value, label: value }))}
              />
            </label>
            <p>Encrypted in transit and at rest · zero-retention processing available.</p>
          </div>
        </article>
        <article className="panel">
          <PanelHead title="Trust and security" />
          <div className="panel-body">
            <dl className="security-list">
              <div><dt>Compliance</dt><dd>SOC 2 Type 2</dd></div>
              <div><dt>Training</dt><dd>Customer data excluded</dd></div>
              <div><dt>Region</dt><dd>EU workspace</dd></div>
            </dl>
          </div>
        </article>
        <article className="panel">
          <PanelHead title="Plan and limits" meta="Studio" />
          <div className="panel-body">
            <div className="usage-meter"><span /></div>
            <p>42 of 100 monthly runs · 10 records per task · 30 steps</p>
          </div>
        </article>
      </section>
    </>
  );
}
