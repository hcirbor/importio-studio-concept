'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/design-system';
import { useAuth, can, type Member, type Role, type WorkspaceApiKey } from '@/lib/auth';
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

const curlExample = `curl -X POST https://api.import.io/v1/tasks \\
  -H 'Authorization: Bearer $IMPORTIO_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"workflow":"compare","sources":[...]}'`;

const mcpSetups = [
  { id: 'claude', label: 'Claude', title: 'Claude connector setup', setup: 'Customize → Connectors → Add custom connector → https://mcp.import.io/mcp' },
  { id: 'claude-code', label: 'Claude Code', title: 'Claude Code setup command', setup: 'claude mcp add --transport http importio https://mcp.import.io/mcp' },
  { id: 'chatgpt', label: 'ChatGPT', title: 'ChatGPT connector setup', setup: 'Settings → Apps → Advanced settings → Developer mode → Create (Business/Enterprise/Edu)' },
  { id: 'cursor', label: 'Cursor', title: '~/.cursor/mcp.json', setup: `{\n  "mcpServers": {\n    "importio": {\n      "url": "https://mcp.import.io/mcp"\n    }\n  }\n}` },
  { id: 'vs-code', label: 'VS Code', title: 'VS Code MCP configuration', setup: `{\n  "servers": {\n    "importio": {\n      "type": "http",\n      "url": "https://mcp.import.io/mcp"\n    }\n  }\n}` },
  { id: 'codex', label: 'Codex', title: 'Codex setup commands', setup: `codex mcp add importio --url https://mcp.import.io/mcp\ncodex mcp login importio` },
] as const;

const initialWebhookEndpoints: WebhookEndpoint[] = [
  {
    id: 'primary-data-endpoint',
    url: 'https://data.example.com/importio',
    events: 'Run completed · Monitor changed',
    health: 'Healthy',
  },
];

const usageRows: TableRow[] = [
  { id: 'outdoor-catalogue', cells: ['Outdoor catalogue', '742', '81,412', '246 min', '$5.19'] },
  { id: 'competitor-prices', cells: ['Competitor prices', '422', '8,996', '130 min', '$2.95'] },
  { id: 'qualified-suppliers', cells: ['Qualified suppliers', '120', '2,204', '42 min', '$0.84'] },
];

export function DevelopersSection({ showHeader = true }: { showHeader?: boolean }) {
  const auth = useAuth();
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
          {auth.apiKeys.length ? <div className="developer-key-row"><code>{auth.apiKeys[0].display}</code><Button variant="ghost" size="sm" onClick={() => void copySetup('Credential', 'Authorization: Bearer mcp_live_…')}>Copy</Button></div> : <div className="developer-key-row"><span>No active API key</span></div>}
          <dl className="developer-facts">
            <div><dt>Endpoint</dt><dd>https://mcp.import.io/mcp</dd></div>
            <div><dt>Transport</dt><dd>Streamable HTTP</dd></div>
            <div><dt>Authentication</dt><dd>OAuth or bearer token</dd></div>
          </dl>
          <Button variant="secondary" onClick={() => setMessage('Manage MCP keys in Settings.')}>Manage keys</Button>
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

export function WebhooksSection({ showHeader = true }: { showHeader?: boolean }) {
  const auth = useAuth();
  const mayManageWebhooks = can(auth.session, 'manage_webhooks');
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

export function UsageSection() {
  const recentRuns = [32, 41, 36, 58, 44, 49, 34];
  const recentDates = ['Oct 3', 'Oct 4', 'Oct 5', 'Oct 6', 'Oct 7', 'Oct 8', 'Oct 9'];
  return (
    <>
      <PageHead
        group="Reference"
        title="Usage"
        description="Understand activity, limits and estimated cost before workflows become production dependencies."
      />
      <section className="panel usage-spend-banner" aria-label="Monthly spend example">
        <div><span>SPEND THIS MONTH</span><strong>$8.98 estimated</strong><small>Based on $7 per 1,000 queries · $25.00 monthly alert</small></div>
        <div className="spend-progress" aria-label="$8.98 of $25 monthly alert"><span /></div>
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

export function SettingsSection() {
  const auth = useAuth();
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyAccess, setKeyAccess] = useState<'Full' | 'Read-only'>('Full');
  const [revealedKey, setRevealedKey] = useState('');
  const [retention, setRetention] = useState('30 days');
  const [message, setMessage] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('Editor');
  const [memberMenu, setMemberMenu] = useState<Member | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const mayManageMembers = can(auth.session, 'manage_members');
  const mayManageKeys = can(auth.session, 'manage_api_keys');

  function openKeyDialog() {
    setKeyName('');
    setKeyAccess('Full');
    setRevealedKey('');
    setKeyDialogOpen(true);
  }

  function createKey() {
    if (!keyName.trim() || !mayManageKeys) return;
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const suffix = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
    const value = `mcp_live_${suffix}`;
    auth.createApiKey({
      id: value,
      name: keyName.trim(),
      access: keyAccess,
      display: `mcp_live_••••${suffix.slice(-4)}`,
      createdBy: `Created by ${auth.currentUser?.name ?? 'Jordan Davis'} · now`,
    });
    setRevealedKey(value);
  }

  function sendInvites() {
    const emails = inviteEmails.split(/[\s,]+/).map((value)=>value.trim()).filter((value)=>value.includes('@'));
    if (!emails.length) return;
    auth.inviteMembers(emails, inviteRole);
    setInviteEmails('');
    setInviteOpen(false);
    toast(`${emails.length} ${emails.length === 1 ? 'invite' : 'invites'} sent`);
  }

  function changeRole(member: Member, role: Role) {
    if (role === 'Owner' && auth.currentRole !== 'Owner') { setMessage('Only an Owner can assign the Owner role.'); return; }
    const result = auth.changeMemberRole(member.id, role);
    setMessage(result.ok ? `${member.name} is now ${role}.` : result.message ?? 'Role unchanged.');
  }

  function confirmRemove() {
    if (!removeTarget) return;
    const result = auth.removeMember(removeTarget.id);
    setMessage(result.ok ? `${removeTarget.name} removed.` : result.message ?? 'Member not removed.');
    setRemoveTarget(null);
    setMemberMenu(null);
  }

  function revokeKey(key: WorkspaceApiKey) {
    auth.revokeApiKey(key.id);
    setMessage(`${key.name} revoked.`);
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(revealedKey);
      setMessage('API key copied to clipboard.');
    } catch {
      setMessage('Clipboard access is unavailable here. Select the key above to copy it.');
    }
  }
  async function copyMemberEmail(member: Member) {
    try {
      await navigator.clipboard.writeText(member.email);
      setMessage(`${member.email} copied.`);
    } catch {
      setMessage('Clipboard access is unavailable here.');
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
      <section className="settings-grid">
        <article className="panel">
          <PanelHead title="API keys" action={<Button variant="primary" disabled={!mayManageKeys} title={!mayManageKeys ? 'Admin access is required to manage API keys.' : undefined} onClick={openKeyDialog}>Create key</Button>} />
          {auth.apiKeys.length ? auth.apiKeys.map((key) => (
            <div className="settings-row" key={key.id}>
              <span><strong>{key.name}</strong><small>{key.display}{key.access ? ` · ${key.access}` : ''}</small><small>{key.createdBy}</small></span>
              <Button variant="secondary" disabled={!mayManageKeys} title={!mayManageKeys ? 'Admin access is required to manage API keys.' : undefined} onClick={() => revokeKey(key)}>Revoke</Button>
            </div>
          )) : (
            <div className="panel-body"><p>No active API keys.</p></div>
          )}
        </article>
        <article className="panel team-panel">
          <PanelHead title="Members" action={<Button variant="primary" disabled={!mayManageMembers} onClick={()=>setInviteOpen(true)}>Invite members</Button>} />
          <div className="team-table-wrap"><table className="data-table team-table"><thead><tr><th>Member</th><th>Role</th><th>Last active</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{auth.members.map((member)=>{const isLastOwner=member.status!=='Invited'&&member.role==='Owner'&&auth.members.filter((item)=>item.status!=='Invited'&&item.role==='Owner').length===1;return <tr key={member.id}><td><strong>{member.name}</strong><small>{member.email}</small>{member.status ? <Badge tone="warning">Invited</Badge> : null}</td><td><span className="member-control-tooltip" data-tooltip={isLastOwner?'A workspace needs at least one Owner.':undefined} tabIndex={isLastOwner?0:undefined}><SelectField label={`Role for ${member.email}`} value={member.role} disabled={!mayManageMembers||isLastOwner} onValueChange={(value)=>changeRole(member,value as Role)} options={(auth.currentRole==='Owner'?['Owner','Admin','Editor','Viewer']:['Admin','Editor','Viewer']).map((role)=>({value:role,label:role}))} className="member-role-select" /></span>{isLastOwner ? <small className="member-lock-note">A workspace needs at least one Owner.</small> : null}</td><td>{member.lastActive}</td><td><Button variant="ghost" size="sm" disabled={!mayManageMembers} aria-label={`Actions for ${member.email}`} onClick={()=>setMemberMenu(member)}>…</Button></td></tr>})}</tbody></table></div>
        </article>
        <article className="panel">
          <PanelHead title="Data handling" />
          <div className="panel-body">
            <label>
              DEFAULT RETENTION
              <SelectField
                label="Default retention"
                value={retention}
                disabled={auth.currentRole === 'Viewer'}
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
              <div><dt>Compliance</dt><dd>Compliance documents on request</dd></div>
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
      <Dialog open={keyDialogOpen} onOpenChange={(open)=>{setKeyDialogOpen(open);if(!open)setRevealedKey('');}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{revealedKey ? 'Your API key' : 'Create API key'}</DialogTitle>
            <DialogDescription>{revealedKey ? "Copy this key now. You won't see it again." : 'Name this key and choose its access level.'}</DialogDescription>
          </DialogHeader>
          {revealedKey ? <div className="secret-reveal"><code>{revealedKey}</code><Button variant="secondary" onClick={()=>void copyKey()}>Copy</Button></div> : <div className="dialog-form"><label>NAME<Input autoFocus value={keyName} onChange={(event)=>setKeyName(event.target.value)} placeholder="Cursor laptop" required /></label><label>ACCESS<SelectField label="API key access" value={keyAccess} onValueChange={(value)=>setKeyAccess(value as 'Full' | 'Read-only')} options={[{value:'Full',label:'Full'},{value:'Read-only',label:'Read-only'}]} /></label></div>}
          <DialogFooter>{revealedKey ? <Button variant="primary" onClick={()=>{setKeyDialogOpen(false);setRevealedKey('');}}>Done</Button> : <><Button variant="secondary" onClick={()=>setKeyDialogOpen(false)}>Cancel</Button><Button variant="primary" disabled={!keyName.trim()} onClick={createKey}>Create key</Button></>}</DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogContent><DialogHeader><DialogTitle>Invite members</DialogTitle><DialogDescription>Demo invitations stay in this browser.</DialogDescription></DialogHeader><label className="dialog-field">EMAILS<Input value={inviteEmails} onChange={(event)=>setInviteEmails(event.target.value)} placeholder="maya@example.com, sam@example.com" /></label><label className="dialog-field">ROLE<SelectField label="Invite role" value={inviteRole} onValueChange={(value)=>setInviteRole(value as Role)} options={['Editor','Viewer','Admin',...(auth.currentRole==='Owner'?['Owner']:[])].map((role)=>({value:role,label:role}))} /></label><Button variant="primary" disabled={!inviteEmails.trim()} onClick={sendInvites}>Send invites</Button></DialogContent></Dialog>
      <Dialog open={Boolean(memberMenu)} onOpenChange={(open)=>!open&&setMemberMenu(null)}><DialogContent className="member-menu-dialog"><DialogHeader><DialogTitle>{memberMenu?.name}</DialogTitle><DialogDescription>{memberMenu?.email}</DialogDescription></DialogHeader>{memberMenu ? <Button variant="secondary" onClick={()=>void copyMemberEmail(memberMenu)}>Copy email</Button> : null}{memberMenu?.status === 'Invited' ? <><Button variant="secondary" onClick={()=>{auth.resendInvite(memberMenu.id);setMessage(`Invite resent to ${memberMenu.email}.`);setMemberMenu(null);}}>Resend</Button><Button variant="secondary" onClick={()=>{auth.revokeInvite(memberMenu.id);setMessage(`Invite to ${memberMenu.email} revoked.`);setMemberMenu(null);}}>Revoke</Button></> : (()=>{const isLastOwner=Boolean(memberMenu&&memberMenu.role==='Owner'&&auth.members.filter((item)=>item.status!=='Invited'&&item.role==='Owner').length===1);return <><label className="dialog-field">CHANGE ROLE<span className="member-control-tooltip" data-tooltip={isLastOwner?'A workspace needs at least one Owner.':undefined} tabIndex={isLastOwner?0:undefined}><SelectField label={`Change role for ${memberMenu?.email ?? 'member'}`} value={memberMenu?.role ?? 'Viewer'} disabled={isLastOwner} onValueChange={(value)=>{if(!memberMenu)return;changeRole(memberMenu,value as Role);setMemberMenu({...memberMenu,role:value as Role});}} options={(auth.currentRole==='Owner'?['Owner','Admin','Editor','Viewer']:['Admin','Editor','Viewer']).map((role)=>({value:role,label:role}))} /></span></label><span className="member-control-tooltip" data-tooltip={isLastOwner?'A workspace needs at least one Owner.':undefined} tabIndex={isLastOwner?0:undefined}><Button variant="secondary" disabled={isLastOwner} onClick={()=>setRemoveTarget(memberMenu)}>Remove</Button></span>{isLastOwner ? <small className="member-lock-note">A workspace needs at least one Owner.</small> : null}</>})()}</DialogContent></Dialog>
      <Dialog open={Boolean(removeTarget)} onOpenChange={(open)=>!open&&setRemoveTarget(null)}><DialogContent><DialogHeader><DialogTitle>Remove {removeTarget?.name}?</DialogTitle><DialogDescription>They will lose access to this demo workspace. At least one Owner must remain.</DialogDescription></DialogHeader><div className="dialog-actions"><Button variant="secondary" onClick={()=>setRemoveTarget(null)}>Cancel</Button><Button variant="primary" onClick={confirmRemove}>Remove member</Button></div></DialogContent></Dialog>
    </>
  );
}
