'use client';

import { useState } from 'react';
import { StatusTag } from '@/components/status-tag';
import { useCapability, useStudio } from '@/lib/data';
import { ApiKeysPanel } from '../settings/api-keys-panel';
import { MembersPanel } from '../settings/members-panel';
import { Feedback, PageHead, PanelHead, SelectField } from './shared';

function auditTime(createdAt: number) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(createdAt);
}

export function SettingsSection() {
  const state = useStudio((snapshot) => ({
    currentRole: snapshot.auth.currentRole,
    members: snapshot.auth.members,
    auditEntries: snapshot.auditEntries,
    preferences: snapshot.notificationPreferences,
    setPreference: snapshot.controlPlane.setNotificationPreference,
  }));
  const channelsCapability = useCapability('monitor-channels');
  const [retention, setRetention] = useState('30 days');
  const [auditMember, setAuditMember] = useState('all');
  const [message, setMessage] = useState('');
  const filteredAudit = auditMember === 'all'
    ? state.auditEntries
    : state.auditEntries.filter((entry) => entry.memberId === auditMember);
  const notificationsDisabled = state.currentRole === 'Viewer';
  const emailDisabled = notificationsDisabled || channelsCapability.status === 'coming-soon';

  return (
    <>
      <PageHead
        group="Reference"
        title="Settings"
        description="Workspace configuration, limits and operational preferences."
      />
      <Feedback>{message}</Feedback>
      <section className="settings-grid">
        <ApiKeysPanel onMessage={setMessage} />
        <MembersPanel onMessage={setMessage} />
        <article className="panel">
          <PanelHead title="Notifications" meta="Workspace" />
          <div className="panel-body notification-preferences">
            <div className="notification-head">
              <span>Event type</span>
              <span>In-app</span>
              <span className="field-label-with-status">
                Email
                <StatusTag capabilityId="monitor-channels" />
              </span>
            </div>
            {state.preferences.map((preference) => (
              <div className="notification-row" key={preference.eventType}>
                <strong>{preference.eventType}</strong>
                <label>
                  <span className="sr-only">In-app notifications for {preference.eventType}</span>
                  <input
                    type="checkbox"
                    checked={preference.inApp}
                    disabled={notificationsDisabled}
                    onChange={(event) => state.setPreference(preference.eventType, 'inApp', event.target.checked)}
                  />
                </label>
                <label>
                  <span className="sr-only">Email notifications for {preference.eventType}</span>
                  <input
                    type="checkbox"
                    checked={preference.email}
                    disabled={emailDisabled}
                    onChange={(event) => state.setPreference(preference.eventType, 'email', event.target.checked)}
                  />
                </label>
              </div>
            ))}
            <p>Delivery failures remain visible in Studio.</p>
          </div>
        </article>
        <article className="panel">
          <PanelHead title="Audit log" meta="Last 30 days" />
          <div className="panel-body">
            <label>
              MEMBER
              <SelectField
                label="Filter audit log by member"
                value={auditMember}
                onValueChange={setAuditMember}
                options={[
                  { value: 'all', label: 'All members' },
                  ...state.members
                    .filter((member) => member.status !== 'Invited')
                    .map((member) => ({ value: member.id, label: member.name })),
                ]}
              />
            </label>
            {filteredAudit.length ? (
              <dl className="security-list audit-list">
                {filteredAudit.map((entry) => (
                  <div key={entry.id}>
                    <dt>{auditTime(entry.createdAt)}</dt>
                    <dd>{entry.memberName} {entry.action}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>No matching demo actions yet.</p>
            )}
          </div>
        </article>
        <article className="panel">
          <PanelHead title="Data handling" />
          <div className="panel-body">
            <label>
              DEFAULT RETENTION
              <SelectField
                label="Default retention"
                value={retention}
                disabled={state.currentRole === 'Viewer'}
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
              <div>
                <dt>Compliance</dt>
                <dd>Compliance documents on request</dd>
              </div>
              <div>
                <dt>Training</dt>
                <dd>Customer data excluded</dd>
              </div>
              <div>
                <dt>Region</dt>
                <dd>EU workspace</dd>
              </div>
            </dl>
          </div>
        </article>
        <article className="panel">
          <PanelHead title="Plan and limits" meta="Studio" />
          <div className="panel-body">
            <div className="usage-meter">
              <span />
            </div>
            <p>42 of 100 monthly runs · 10 records per task · 30 steps</p>
          </div>
        </article>
      </section>
    </>
  );
}
