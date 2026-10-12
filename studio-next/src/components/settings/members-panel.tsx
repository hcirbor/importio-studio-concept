'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input } from '@/components/design-system';
import { can, isRole, ROLE_VALUES, useStudio, type Member, type Role } from '@/lib/data';
import { PanelHead, SelectField } from '../workspace/shared';

export function MembersPanel({ onMessage }: { onMessage: (message: string) => void }) {
  const auth = useStudio((snapshot) => ({ currentRole: snapshot.auth.currentRole, session: snapshot.auth.session, members: snapshot.auth.members, inviteMembers: snapshot.auth.inviteMembers, changeMemberRole: snapshot.auth.changeMemberRole, removeMember: snapshot.auth.removeMember, resendInvite: snapshot.auth.resendInvite, revokeInvite: snapshot.auth.revokeInvite }));
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('Editor');
  const [memberMenu, setMemberMenu] = useState<Member | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const mayManageMembers = can(auth.session, 'manage_members');

  function sendInvites() {
    const emails = inviteEmails.split(/[\s,]+/).map((value)=>value.trim()).filter((value)=>value.includes('@'));
    if (!emails.length) return;
    auth.inviteMembers(emails, inviteRole); setInviteEmails(''); setInviteOpen(false); toast(`${emails.length} ${emails.length === 1 ? 'invite' : 'invites'} sent`);
  }
  function changeRole(member: Member, role: Role) {
    if (role === 'Owner' && auth.currentRole !== 'Owner') { onMessage('Only an Owner can assign the Owner role.'); return; }
    const result = auth.changeMemberRole(member.id, role); onMessage(result.ok ? `${member.name} is now ${role}.` : result.message ?? 'Role unchanged.');
  }
  function confirmRemove() {
    if (!removeTarget) return;
    const result = auth.removeMember(removeTarget.id); onMessage(result.ok ? `${removeTarget.name} removed.` : result.message ?? 'Member not removed.'); setRemoveTarget(null); setMemberMenu(null);
  }
  async function copyMemberEmail(member: Member) {
    try { await navigator.clipboard.writeText(member.email); onMessage(`${member.email} copied.`); }
    catch { onMessage('Clipboard access is unavailable here.'); }
  }

  return <><article className="panel team-panel"><PanelHead title="Members" action={<Button variant="primary" disabled={!mayManageMembers} onClick={()=>setInviteOpen(true)}>Invite members</Button>} /><div className="team-table-wrap"><table className="data-table team-table"><thead><tr><th>Member</th><th>Role</th><th>Last active</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{auth.members.map((member)=>{const isLastOwner=member.status!=='Invited'&&member.role==='Owner'&&auth.members.filter((item)=>item.status!=='Invited'&&item.role==='Owner').length===1;return <tr key={member.id}><td><strong>{member.name}</strong><small>{member.email}</small>{member.status ? <Badge tone="warning">Invited</Badge> : null}</td><td><span className="member-control-tooltip" data-tooltip={isLastOwner?'A workspace needs at least one Owner.':undefined} tabIndex={isLastOwner?0:undefined}><SelectField label={`Role for ${member.email}`} value={member.role} disabled={!mayManageMembers||isLastOwner} onValueChange={(value)=>{if(isRole(value))changeRole(member,value);}} options={(auth.currentRole==='Owner'?ROLE_VALUES:ROLE_VALUES.filter((role)=>role!=='Owner')).map((role)=>({value:role,label:role}))} className="member-role-select" /></span>{isLastOwner ? <small className="member-lock-note">A workspace needs at least one Owner.</small> : null}</td><td>{member.lastActive}</td><td><Button variant="ghost" size="sm" disabled={!mayManageMembers} aria-label={`Actions for ${member.email}`} onClick={()=>setMemberMenu(member)}>…</Button></td></tr>})}</tbody></table></div></article><Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogContent><DialogHeader><DialogTitle>Invite members</DialogTitle><DialogDescription>Demo invitations stay in this browser.</DialogDescription></DialogHeader><label className="dialog-field">EMAILS<Input value={inviteEmails} onChange={(event)=>setInviteEmails(event.target.value)} placeholder="maya@example.com, sam@example.com" /></label><label className="dialog-field">ROLE<SelectField label="Invite role" value={inviteRole} onValueChange={(value)=>{if(isRole(value))setInviteRole(value);}} options={['Editor','Viewer','Admin',...(auth.currentRole==='Owner'?['Owner']:[])].map((role)=>({value:role,label:role}))} /></label><Button variant="primary" disabled={!inviteEmails.trim()} onClick={sendInvites}>Send invites</Button></DialogContent></Dialog><Dialog open={Boolean(memberMenu)} onOpenChange={(open)=>!open&&setMemberMenu(null)}><DialogContent className="member-menu-dialog"><DialogHeader><DialogTitle>{memberMenu?.name}</DialogTitle><DialogDescription>{memberMenu?.email}</DialogDescription></DialogHeader>{memberMenu ? <Button variant="secondary" onClick={()=>void copyMemberEmail(memberMenu)}>Copy email</Button> : null}{memberMenu?.status === 'Invited' ? <><Button variant="secondary" onClick={()=>{auth.resendInvite(memberMenu.id);onMessage(`Invite resent to ${memberMenu.email}.`);setMemberMenu(null);}}>Resend</Button><Button variant="secondary" onClick={()=>{auth.revokeInvite(memberMenu.id);onMessage(`Invite to ${memberMenu.email} revoked.`);setMemberMenu(null);}}>Revoke</Button></> : (()=>{const isLastOwner=Boolean(memberMenu&&memberMenu.role==='Owner'&&auth.members.filter((item)=>item.status!=='Invited'&&item.role==='Owner').length===1);return <><label className="dialog-field">CHANGE ROLE<span className="member-control-tooltip" data-tooltip={isLastOwner?'A workspace needs at least one Owner.':undefined} tabIndex={isLastOwner?0:undefined}><SelectField label={`Change role for ${memberMenu?.email ?? 'member'}`} value={memberMenu?.role ?? 'Viewer'} disabled={isLastOwner} onValueChange={(value)=>{if(!memberMenu||!isRole(value))return;changeRole(memberMenu,value);setMemberMenu({...memberMenu,role:value});}} options={(auth.currentRole==='Owner'?ROLE_VALUES:ROLE_VALUES.filter((role)=>role!=='Owner')).map((role)=>({value:role,label:role}))} /></span></label><span className="member-control-tooltip" data-tooltip={isLastOwner?'A workspace needs at least one Owner.':undefined} tabIndex={isLastOwner?0:undefined}><Button variant="secondary" disabled={isLastOwner} onClick={()=>setRemoveTarget(memberMenu)}>Remove</Button></span>{isLastOwner ? <small className="member-lock-note">A workspace needs at least one Owner.</small> : null}</>})()}</DialogContent></Dialog><Dialog open={Boolean(removeTarget)} onOpenChange={(open)=>!open&&setRemoveTarget(null)}><DialogContent><DialogHeader><DialogTitle>Remove {removeTarget?.name}?</DialogTitle><DialogDescription>They will lose access to this demo workspace. At least one Owner must remain.</DialogDescription></DialogHeader><div className="dialog-actions"><Button variant="secondary" onClick={()=>setRemoveTarget(null)}>Cancel</Button><Button variant="primary" onClick={confirmRemove}>Remove member</Button></div></DialogContent></Dialog></>;
}
