'use client';

import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@/components/design-system';
import { can, isNotificationChannel, useStudio, viewerTooltip, type NotificationChannel } from '@/lib/data';
import { SelectField } from '../workspace/shared';

export function CreateMonitorDialog({ open, onOpenChange, onMessage }: { open: boolean; onOpenChange: (open: boolean) => void; onMessage: (message: string) => void }) {
  const session = useStudio((snapshot) => snapshot.auth.session);
  const currentUser = useStudio((snapshot) => snapshot.auth.currentUser);
  const execution = useStudio((snapshot) => snapshot.execution);
  const pipelines = useStudio((snapshot) => snapshot.fixtures.pipelines);
  const mayCreateMonitor = can(session, 'create_monitor');
  const [pipeline, setPipeline] = useState('Competitor prices');
  const [schedule, setSchedule] = useState('Daily');
  const [watchedFields, setWatchedFields] = useState(['Price', 'Availability']);
  const [alertWhen, setAlertWhen] = useState('Any change');
  const [priceThreshold, setPriceThreshold] = useState('€230');
  const [notifyVia, setNotifyVia] = useState<NotificationChannel>('Email');
  const fieldsByPipeline: Record<string, string[]> = { 'Competitor prices': ['Price', 'Availability'], 'Outdoor catalogue': ['Product', 'Price', 'Availability', 'URL'], 'Qualified suppliers': ['Company', 'Location', 'Minimum order', 'Lead time'] };
  const alertRule = alertWhen === 'Price falls below' ? `Price falls below ${priceThreshold}` : alertWhen;

  async function createMonitor() {
    await execution.createMonitor({ name: `${pipeline} monitor`, detail: `${alertRule} · ${notifyVia}`, workflowName: pipeline, sources: [], schedule, lastChange: 'Not checked yet', status: 'Scheduled', tone: 'info', fields: watchedFields, alertRule, notifyVia });
    onOpenChange(false);
    onMessage(`${pipeline} will be checked ${schedule.toLowerCase()}.`);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Create a monitor</DialogTitle><DialogDescription>Choose a trusted pipeline and how often Import.io should check for meaningful changes.</DialogDescription></DialogHeader><div className="dialog-form"><label>PIPELINE<SelectField label="Pipeline" value={pipeline} onValueChange={(value)=>{setPipeline(value);setWatchedFields(fieldsByPipeline[value] ?? []);}} options={pipelines.map((item) => ({ value: item.name, label: item.name }))} /></label><fieldset className="monitor-fields"><legend>FIELDS TO WATCH</legend>{(fieldsByPipeline[pipeline] ?? []).map((field)=><label key={field}><input type="checkbox" checked={watchedFields.includes(field)} onChange={(event)=>setWatchedFields((current)=>event.target.checked?[...current,field]:current.filter((item)=>item!==field))} /> {field}</label>)}</fieldset><label>ALERT WHEN<SelectField label="Alert when" value={alertWhen} onValueChange={setAlertWhen} options={['Any change','Price falls below','Goes out of stock'].map((value)=>({value,label:value}))} /></label>{alertWhen === 'Price falls below' ? <label>VALUE<Input value={priceThreshold} onChange={(event)=>setPriceThreshold(event.target.value)} placeholder="€230" /></label> : null}<label>NOTIFY VIA<SelectField label="Notify via" value={notifyVia} onValueChange={(value)=>{if(isNotificationChannel(value))setNotifyVia(value);}} options={[{value:'Email',label:`Email · ${currentUser?.email ?? 'current user'}`},{value:'Slack',label:'Slack'},{value:'Webhook',label:'Webhook'}]} /></label><label>SCHEDULE<SelectField label="Schedule" value={schedule} onValueChange={setSchedule} options={['Hourly', 'Daily'].map((value) => ({ value, label: value }))} /></label></div><DialogFooter><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" disabled={!mayCreateMonitor || watchedFields.length === 0} title={!mayCreateMonitor ? viewerTooltip : undefined} onClick={() => void createMonitor()}>Create monitor</Button></DialogFooter></DialogContent></Dialog>;
}
