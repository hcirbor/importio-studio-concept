'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/design-system';
import { useStudio } from '@/lib/data';
import { Feedback, PageHead, PanelHead } from './shared';

const curlExample = `curl -X POST https://api.import.io/v1/tasks \\
  -H 'Authorization: Bearer $IMPORTIO_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"workflow":"compare","sources":[...]}'`;

export function DevelopersSection({ showHeader = true }: { showHeader?: boolean }) {
  const apiKeys = useStudio((snapshot) => snapshot.auth.apiKeys);
  const mcpSetups = useStudio((snapshot) => snapshot.fixtures.mcpSetups);
  const [message, setMessage] = useState('');
  const [connectionChecked, setConnectionChecked] = useState(false);

  async function copyCurl() {
    try {
      await navigator.clipboard.writeText(curlExample);
      setMessage('cURL copied to clipboard.');
    } catch {
      setMessage('Clipboard access is unavailable here. Select the cURL command above to copy it.');
    }
  }

  async function copySetup(label: string, setup: string) {
    try {
      await navigator.clipboard.writeText(setup);
      setMessage(`${label} setup copied to clipboard.`);
    } catch {
      setMessage('Clipboard access is unavailable here. Select the setup text above to copy it.');
    }
  }

  return (
    <>
      {showHeader ? <PageHead group="Develop" title="API & MCP" description="The same task model through API and MCP." /> : null}
      <Feedback>{message}</Feedback>
      <section className="developer-connect-grid">
        <article className="panel mcp-connect-card">
          <div className="developer-card-intro">
            <span>MCP QUICKSTART · CONNECT YOUR TOOL</span>
            <h2>Use Import.io from the agent you already work in.</h2>
            <p>Choose a client. We will give you one setup path with the remote MCP server.</p>
          </div>
          <Tabs defaultValue="claude" className="mcp-client-tabs">
            <TabsList aria-label="MCP client setup">
              {mcpSetups.map((client) => <TabsTrigger key={client.id} value={client.id}>{client.label}</TabsTrigger>)}
            </TabsList>
            {mcpSetups.map((client) => (
              <TabsContent key={client.id} value={client.id}>
                <div className="mcp-setup-block">
                  <div className="mcp-setup-head"><strong>{client.title}</strong><Button variant="ghost" size="sm" onClick={() => void copySetup(client.label, client.setup)}>Copy</Button></div>
                  <pre>{client.setup}</pre>
                </div>
              </TabsContent>
            ))}
          </Tabs>
          <ol className="mcp-setup-steps">
            <li><b>1</b><span>Copy the setup</span></li>
            <li><b>2</b><span>Sign in with OAuth</span></li>
            <li><b>3</b><span>Verify the connection</span></li>
          </ol>
          <div className="mcp-connection-check">
            <span className={connectionChecked ? 'connected' : ''}>{connectionChecked ? 'Connection ready' : 'Connection not checked'}</span>
            <Button variant="secondary" onClick={() => { setConnectionChecked(true); setMessage('MCP connection verified for this demo.'); }}>Check connection</Button>
          </div>
        </article>
        <aside className="panel developer-credential-card">
          <div className="developer-card-intro">
            <span>REMOTE MCP SERVER</span>
            <h2>Import.io MCP</h2>
            <p>10,000 free successful calls. Authenticate with OAuth, or use a scoped bearer token.</p>
          </div>
          {apiKeys.length ? <div className="developer-key-row"><code>{apiKeys[0].display}</code><Button variant="ghost" size="sm" onClick={() => void copySetup('Credential', 'Authorization: Bearer mcp_live_…')}>Copy</Button></div> : <div className="developer-key-row"><span>No active API key</span></div>}
          <dl className="developer-facts">
            <div><dt>Endpoint</dt><dd>https://mcp.import.io/mcp</dd></div>
            <div><dt>Transport</dt><dd>Streamable HTTP</dd></div>
            <div><dt>Authentication</dt><dd>OAuth or bearer token</dd></div>
          </dl>
          <Button variant="secondary" asChild><Link href="/settings?tab=api-keys">Manage keys</Link></Button>
        </aside>
      </section>
      <section className="panel developer-concept-card">
        <PanelHead title="Concept preview" meta="Task API · POST /v1/tasks" />
        <div className="panel-body">
          <p>Submit a task, keep its ID, and retrieve the result when it is ready.</p>
          <pre className="code-block">{curlExample}</pre>
          <Button variant="secondary" onClick={copyCurl}>Copy cURL</Button>
        </div>
      </section>
    </>
  );
}
