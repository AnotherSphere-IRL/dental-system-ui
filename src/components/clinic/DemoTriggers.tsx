import { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import type { DemoTrigger } from '../../context/ClinicContext';

interface TriggerDef {
  id: DemoTrigger;
  label: string;
  description: string;
  tone: 'primary' | 'warning' | 'alert';
}

const TRIGGERS: TriggerDef[] = [
  { id: 'force-eod-dispatch', label: 'Force EOD dispatch', description: 'Dispatches all queued orders immediately, ignoring the end-of-day hour check.', tone: 'primary' },
  { id: 'simulate-reply-confirmed', label: 'Simulate supplier confirmed', description: 'Injects a "Confirmed" reply on the oldest sent order and moves it to Being Delivered.', tone: 'primary' },
  { id: 'simulate-reply-unavailable', label: 'Simulate supplier unavailable', description: 'Injects an "Out of stock" reply and triggers automatic reroute to backup chain.', tone: 'warning' },
  { id: 'simulate-no-response', label: 'Simulate no response', description: 'Forces the response-window timeout and triggers reroute to next backup.', tone: 'warning' },
  { id: 'simulate-email-bounce', label: 'Simulate email bounce', description: 'Marks the latest dispatch log as bounced and escalates for doctor review.', tone: 'alert' },
];

export default function DemoTriggers() {
  const [open, setOpen] = useState(false);
  const { fireDemoTrigger, orders, inventoryAlertLog, overstockReviewNotes, orderDispatchLog } = useClinic();

  const queued = orders.filter(o => o.status === 'queued').length;
  const sent = orders.filter(o => o.status === 'sent').length;
  const openAlerts = inventoryAlertLog.filter(a => !a.acknowledged).length;
  const openNotes = overstockReviewNotes.filter(n => n.status === 'open').length;
  const bounced = orderDispatchLog.filter(l => l.deliveryStatus === 'bounced').length;

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          title="Dev tools"
          className="w-8 h-8 rounded-full bg-clinical-200 text-clinical-600 flex items-center justify-center opacity-20 hover:opacity-100 transition-opacity"
          aria-label="Open dev tools"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
        </button>
      ) : (
        <div className="w-80 rounded-2xl border border-clinical-200 bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-clinical-900 text-white">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-warning-500 animate-pulse" />
              <span className="text-xs font-semibold tracking-wide uppercase">Dev Tools</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-clinical-400 hover:text-white transition-colors" aria-label="Close">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-5 gap-px bg-clinical-100 border-b border-clinical-100">
            {[
              { label: 'Queued', value: queued, tone: queued > 0 ? 'text-primary-700 bg-primary-50' : 'text-clinical-500 bg-white' },
              { label: 'Sent', value: sent, tone: sent > 0 ? 'text-primary-700 bg-primary-50' : 'text-clinical-500 bg-white' },
              { label: 'Alerts', value: openAlerts, tone: openAlerts > 0 ? 'text-warning-700 bg-warning-50' : 'text-clinical-500 bg-white' },
              { label: 'Overstock', value: openNotes, tone: openNotes > 0 ? 'text-primary-700 bg-primary-50' : 'text-clinical-500 bg-white' },
              { label: 'Bounces', value: bounced, tone: bounced > 0 ? 'text-alert-700 bg-alert-50' : 'text-clinical-500 bg-white' },
            ].map(s => (
              <div key={s.label} className={`px-1 py-2 text-center ${s.tone}`}>
                <div className="text-sm font-bold tabular-nums">{s.value}</div>
                <div className="text-[9px] font-medium uppercase tracking-wide opacity-80">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="divide-y divide-clinical-50">
            {TRIGGERS.map(t => (
              <button key={t.id} onClick={() => fireDemoTrigger(t.id)} className="w-full text-left px-4 py-3 hover:bg-clinical-50 transition-colors">
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${t.tone === 'alert' ? 'bg-alert-500' : t.tone === 'warning' ? 'bg-warning-500' : 'bg-primary-500'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-clinical-800">{t.label}</p>
                    <p className="text-[10px] text-clinical-500 mt-0.5 leading-relaxed">{t.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="px-4 py-2 bg-clinical-50 border-t border-clinical-100">
            <p className="text-[9px] text-clinical-400 leading-relaxed">Mounted only on the Dashboard. Safe to remove for production.</p>
          </div>
        </div>
      )}
    </div>
  );
}
