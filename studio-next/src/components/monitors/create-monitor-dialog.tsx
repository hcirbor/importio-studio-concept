'use client';

import { useMemo, useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@/components/design-system';
import { can, isNotificationChannel, useCapability, useStudio, viewerTooltip, type NotificationChannel, type WorkspaceDataset } from '@/lib/data';
import { formatFieldLabel } from '@/lib/workflow/fields';
import { StatusTag, statusTagsEnabled } from '@/components/status-tag';
import { SelectField } from '../workspace/shared';

type CreateMonitorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessage?: (message: string) => void;
  initialPipeline?: string;
  initialFields?: string[];
  sources?: string[];
  runId?: string;
  onCreated?: (dataset: WorkspaceDataset) => void;
};

const defaultFieldsByPipeline: Record<string, string[]> = {
  'Competitor prices': ['Price', 'Availability'],
  'Outdoor catalogue': ['Product', 'Price', 'Availability', 'URL'],
  'Qualified suppliers': ['Company', 'Location', 'Minimum order', 'Lead time'],
};

export function CreateMonitorDialog({ open, onOpenChange, onMessage, initialPipeline = 'Competitor prices', initialFields, sources = [], runId, onCreated }: CreateMonitorDialogProps) {
  const session = useStudio((snapshot) => snapshot.auth.session);
  const currentUser = useStudio((snapshot) => snapshot.auth.currentUser);
  const execution = useStudio((snapshot) => snapshot.execution);
  const pipelines = useStudio((snapshot) => snapshot.fixtures.pipelines);
  const rulesCapability = useCapability('monitor-rules');
  const channelsCapability = useCapability('monitor-channels');
  const mayCreateMonitor = can(session, 'create_monitor');
  const pipelineOptions = useMemo(() => [initialPipeline, ...pipelines.map((item) => item.name).filter((name) => name !== initialPipeline)], [initialPipeline, pipelines]);
  const fieldsByPipeline = useMemo(() => ({ ...defaultFieldsByPipeline, ...(initialFields ? { [initialPipeline]: initialFields } : {}) }), [initialFields, initialPipeline]);
  const [pipeline, setPipeline] = useState(initialPipeline);
  const [schedule, setSchedule] = useState('Daily');
  const [watchedFields, setWatchedFields] = useState(initialFields ?? fieldsByPipeline[initialPipeline] ?? []);
  const [alertWhen, setAlertWhen] = useState('Any change');
  const [priceThreshold, setPriceThreshold] = useState('€230');
  const [notifyVia, setNotifyVia] = useState<NotificationChannel>('Email');
  const [rulesNoteOpen, setRulesNoteOpen] = useState(false);
  const [channelsNoteOpen, setChannelsNoteOpen] = useState(false);
  const alertRule = alertWhen === 'Price falls below' ? `Price falls below ${priceThreshold}` : alertWhen;

  async function createMonitor() {
    const { dataset } = await execution.createMonitor({ name: `${pipeline} monitor`, detail: `${alertRule} · ${notifyVia}`, workflowName: pipeline, sources, runId, schedule, lastChange: 'Not checked yet', status: 'Scheduled', tone: 'info', fields: watchedFields, alertRule, notifyVia });
    onOpenChange(false);
    onMessage?.(`${pipeline} will be checked ${schedule.toLowerCase()}.`);
    onCreated?.(dataset);
  }

  function chooseAlert(value: string) {
    if (statusTagsEnabled && rulesCapability.status === 'coming-soon' && value === 'Price falls below') {
      setRulesNoteOpen(true);
      return;
    }
    setAlertWhen(value);
  }

  function chooseChannel(value: string) {
    if (!isNotificationChannel(value)) return;
    if (statusTagsEnabled && channelsCapability.status === 'coming-soon' && (value === 'Email' || value === 'Slack')) {
      setChannelsNoteOpen(true);
      return;
    }
    setNotifyVia(value);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Create a monitor</DialogTitle><DialogDescription>Choose a trusted pipeline and how often Import.io should check for meaningful changes.</DialogDescription></DialogHeader><div className="dialog-form"><label>PIPELINE<SelectField label="Pipeline" value={pipeline} onValueChange={(value) => { setPipeline(value); setWatchedFields(fieldsByPipeline[value] ?? []); }} options={pipelineOptions.map((name) => ({ value: name, label: name }))} /></label><label>SCHEDULE<SelectField label="Schedule" value={schedule} onValueChange={setSchedule} options={['Hourly', 'Daily'].map((value) => ({ value, label: value }))} /></label><fieldset className="monitor-field-picker"><legend>FIELDS TO WATCH</legend>{(fieldsByPipeline[pipeline] ?? []).map((field) => <label key={field}><input type="checkbox" checked={watchedFields.includes(field)} onChange={(event) => setWatchedFields((current) => event.target.checked ? [...current, field] : current.filter((item) => item !== field))} />{formatFieldLabel(field)}</label>)}</fieldset><div className="dialog-field"><span className="field-label-with-status">ALERT WHEN <StatusTag capabilityId="monitor-rules" open={rulesNoteOpen} onOpenChange={setRulesNoteOpen} /></span><SelectField label="Alert when" value={alertWhen} onValueChange={chooseAlert} options={['Any change', 'Price falls below', 'Goes out of stock'].map((value) => ({ value, label: value }))} /></div>{alertWhen === 'Price falls below' ? <label>VALUE<Input value={priceThreshold} onChange={(event) => setPriceThreshold(event.target.value)} placeholder="€230" /></label> : null}<div className="dialog-field"><span className="field-label-with-status">NOTIFY VIA <StatusTag capabilityId="monitor-channels" open={channelsNoteOpen} onOpenChange={setChannelsNoteOpen} /></span><SelectField label="Notify via" value={notifyVia} onValueChange={chooseChannel} options={[{ value: 'Email', label: `Email · ${currentUser?.email ?? 'current user'}` }, { value: 'Slack', label: 'Slack' }, { value: 'Webhook', label: 'Webhook' }]} /></div></div><DialogFooter><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" disabled={!mayCreateMonitor || watchedFields.length === 0} title={!mayCreateMonitor ? viewerTooltip : undefined} onClick={() => void createMonitor()}>Create monitor</Button></DialogFooter></DialogContent></Dialog>;
}
