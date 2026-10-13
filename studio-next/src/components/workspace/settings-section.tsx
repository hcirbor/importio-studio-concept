'use client';

import { useState } from 'react';
import { useStudio } from '@/lib/data';
import { ApiKeysPanel } from '../settings/api-keys-panel';
import { MembersPanel } from '../settings/members-panel';
import { Feedback, PageHead, PanelHead, SelectField } from './shared';

export function SettingsSection() {
  const currentRole = useStudio((snapshot) => snapshot.auth.currentRole);
  const [retention, setRetention] = useState('30 days');
  const [notifications, setNotifications] = useState('Review and monitor changes');
  const [message, setMessage] = useState('');
  return <><PageHead group="Reference" title="Settings" description="Workspace configuration, limits and operational preferences." /><Feedback>{message}</Feedback><section className="settings-grid"><ApiKeysPanel onMessage={setMessage} /><MembersPanel onMessage={setMessage} /><article className="panel"><PanelHead title="Notifications" meta="Workspace" /><div className="panel-body"><label>EMAIL NOTIFICATIONS<SelectField label="Email notifications" value={notifications} disabled={currentRole === 'Viewer'} onValueChange={(value) => { setNotifications(value); setMessage(`Notifications updated to ${value}.`); }} options={['Review and monitor changes', 'Review only', 'None'].map((value) => ({ value, label: value }))} /></label><p>Delivery failures remain visible in Studio.</p></div></article><article className="panel"><PanelHead title="Audit log" meta="Latest activity" /><div className="panel-body"><dl className="security-list"><div><dt>Today · 09:42</dt><dd>Jordan accepted a monitor baseline</dd></div><div><dt>Yesterday</dt><dd>Maya updated the Competitor prices schedule</dd></div><div><dt>10 Oct</dt><dd>Jordan created the Production API key</dd></div></dl></div></article><article className="panel"><PanelHead title="Data handling" /><div className="panel-body"><label>DEFAULT RETENTION<SelectField label="Default retention" value={retention} disabled={currentRole === 'Viewer'} onValueChange={(value) => { setRetention(value); setMessage(`Default retention updated to ${value}.`); }} options={['30 days', '90 days', '1 year'].map((value) => ({ value, label: value }))} /></label><p>Encrypted in transit and at rest · zero-retention processing available.</p></div></article><article className="panel"><PanelHead title="Trust and security" /><div className="panel-body"><dl className="security-list"><div><dt>Compliance</dt><dd>Compliance documents on request</dd></div><div><dt>Training</dt><dd>Customer data excluded</dd></div><div><dt>Region</dt><dd>EU workspace</dd></div></dl></div></article><article className="panel"><PanelHead title="Plan and limits" meta="Studio" /><div className="panel-body"><div className="usage-meter"><span /></div><p>42 of 100 monthly runs · 10 records per task · 30 steps</p></div></article></section></>;
}
