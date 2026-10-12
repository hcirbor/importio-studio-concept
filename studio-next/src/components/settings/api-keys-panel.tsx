'use client';

import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@/components/design-system';
import { can, useStudio, type WorkspaceApiKey } from '@/lib/data';
import { PanelHead, SelectField } from '../workspace/shared';

function isKeyAccess(value: string): value is 'Full' | 'Read-only' {
  return value === 'Full' || value === 'Read-only';
}

export function ApiKeysPanel({ onMessage }: { onMessage: (message: string) => void }) {
  const auth = useStudio((snapshot) => ({ session: snapshot.auth.session, currentUser: snapshot.auth.currentUser, apiKeys: snapshot.auth.apiKeys, createApiKey: snapshot.auth.createApiKey, revokeApiKey: snapshot.auth.revokeApiKey }));
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyAccess, setKeyAccess] = useState<'Full' | 'Read-only'>('Full');
  const [revealedKey, setRevealedKey] = useState('');
  const mayManageKeys = can(auth.session, 'manage_api_keys');

  function openKeyDialog() { setKeyName(''); setKeyAccess('Full'); setRevealedKey(''); setKeyDialogOpen(true); }
  function createKey() {
    if (!keyName.trim() || !mayManageKeys) return;
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const suffix = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
    const value = `mcp_live_${suffix}`;
    auth.createApiKey({ id: value, name: keyName.trim(), access: keyAccess, display: `mcp_live_••••${suffix.slice(-4)}`, createdBy: `Created by ${auth.currentUser?.name ?? 'Jordan Davis'} · now` });
    setRevealedKey(value);
  }
  function revokeKey(key: WorkspaceApiKey) { auth.revokeApiKey(key.id); onMessage(`${key.name} revoked.`); }
  async function copyKey() {
    try { await navigator.clipboard.writeText(revealedKey); onMessage('API key copied to clipboard.'); }
    catch { onMessage('Clipboard access is unavailable here. Select the key above to copy it.'); }
  }

  return <><article className="panel"><PanelHead title="API keys" action={<Button variant="primary" disabled={!mayManageKeys} title={!mayManageKeys ? 'Admin access is required to manage API keys.' : undefined} onClick={openKeyDialog}>Create key</Button>} />{auth.apiKeys.length ? auth.apiKeys.map((key) => <div className="settings-row" key={key.id}><span><strong>{key.name}</strong><small>{key.display}{key.access ? ` · ${key.access}` : ''}</small><small>{key.createdBy}</small></span><Button variant="secondary" disabled={!mayManageKeys} title={!mayManageKeys ? 'Admin access is required to manage API keys.' : undefined} onClick={() => revokeKey(key)}>Revoke</Button></div>) : <div className="panel-body"><p>No active API keys.</p></div>}</article><Dialog open={keyDialogOpen} onOpenChange={(open)=>{setKeyDialogOpen(open);if(!open)setRevealedKey('');}}><DialogContent><DialogHeader><DialogTitle>{revealedKey ? 'Your API key' : 'Create API key'}</DialogTitle><DialogDescription>{revealedKey ? "Copy this key now. You won't see it again." : 'Name this key and choose its access level.'}</DialogDescription></DialogHeader>{revealedKey ? <div className="secret-reveal"><code>{revealedKey}</code><Button variant="secondary" onClick={()=>void copyKey()}>Copy</Button></div> : <div className="dialog-form"><label>NAME<Input autoFocus value={keyName} onChange={(event)=>setKeyName(event.target.value)} placeholder="Cursor laptop" required /></label><label>ACCESS<SelectField label="API key access" value={keyAccess} onValueChange={(value)=>{if(isKeyAccess(value))setKeyAccess(value);}} options={[{value:'Full',label:'Full'},{value:'Read-only',label:'Read-only'}]} /></label></div>}<DialogFooter>{revealedKey ? <Button variant="primary" onClick={()=>{setKeyDialogOpen(false);setRevealedKey('');}}>Done</Button> : <><Button variant="secondary" onClick={()=>setKeyDialogOpen(false)}>Cancel</Button><Button variant="primary" disabled={!keyName.trim()} onClick={createKey}>Create key</Button></>}</DialogFooter></DialogContent></Dialog></>;
}
