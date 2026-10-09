import { useState } from 'react';
import {
  IconCalendar, IconClock, IconCheck, IconAlert,
  IconUser, IconLoader, IconPlus, IconBell, IconX,
} from '../icons';

/* ══════════════════════════════════════════════════════════
   SHARED TYPES & DATA
══════════════════════════════════════════════════════════ */

type ApptStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no-show';
type ReminderChannel = 'email' | 'sms' | 'phone';
type ReminderDelivery = 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';

interface Appointment {
  id: string;
  patient: string; patientId: string;
  service: string; duration: string; price: number;
  date: string; time: string;
  status: ApptStatus;
  reservationPaid: number;
}

interface ReminderTier {
  label: string; channel: ReminderChannel; deliveryStatus: ReminderDelivery;
  scheduledFor: string; sentAt?: string;
}

interface AppointmentReminders {
  apptId: string;
  patient: string; date: string; time: string; service: string;
  tiers: ReminderTier[];
}

interface RescheduleRequest {
  id: string; type: 'reschedule' | 'cancellation';
  patient: string; patientId: string;
  currentDate: string; currentTime: string; service: string;
  requestedDate?: string; requestedTime?: string;
  reason: string; requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  policyCheck: 'pass' | 'fail';
  policyNote: string;
  reservationPaid: number;
}

interface RecallPatient {
  patientId: string; patient: string;
  lastTreatment: string; lastVisit: string;
  recommendedBy: string;
  recallStatus: 'due' | 'overdue';
  daysOverdue: number;
  recallSent: boolean;
}

interface RecallLogEntry {
  id: string; patient: string; dateSent: string;
  statusAtSend: 'due' | 'overdue'; response: 'booked' | 'no-response' | 'declined' | 'pending';
}

/* ── Mock Data ── */

const TODAY = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const APPOINTMENTS: Appointment[] = [
  { id: 'a1', patient: 'Ana Kristina Reyes', patientId: 'P-1042', service: 'Dental Prophylaxis', duration: '45 min', price: 800, date: fmt(TODAY), time: '09:00', status: 'confirmed', reservationPaid: 160 },
  { id: 'a2', patient: 'Jose dela Cruz', patientId: 'P-2001', service: 'Composite Restoration', duration: '60 min', price: 2500, date: fmt(TODAY), time: '10:30', status: 'confirmed', reservationPaid: 500 },
  { id: 'a3', patient: 'Maria Corazon Santos', patientId: 'P-0891', service: 'Root Canal Treatment', duration: '90 min', price: 12000, date: fmt(addDays(TODAY, 1)), time: '14:00', status: 'confirmed', reservationPaid: 2400 },
  { id: 'a4', patient: 'Ramon Aurelio Cruz', patientId: 'P-1156', service: 'Crown Placement', duration: '60 min', price: 15000, date: fmt(addDays(TODAY, 3)), time: '09:30', status: 'pending', reservationPaid: 3000 },
  { id: 'a5', patient: 'Lorna dela Cruz', patientId: 'P-0743', service: 'Dental Examination', duration: '30 min', price: 500, date: fmt(addDays(TODAY, -2)), time: '11:00', status: 'completed', reservationPaid: 100 },
];

const REMINDER_DATA: AppointmentReminders[] = [
  {
    apptId: 'a1', patient: 'Ana Kristina Reyes',
    date: fmt(TODAY), time: '09:00', service: 'Dental Prophylaxis',
    tiers: [
      { label: '48-hour reminder', channel: 'email', deliveryStatus: 'read', scheduledFor: fmt(addDays(TODAY, -2)) + ' 09:00', sentAt: fmt(addDays(TODAY, -2)) + ' 09:01' },
      { label: '24-hour reminder', channel: 'email', deliveryStatus: 'delivered', scheduledFor: fmt(addDays(TODAY, -1)) + ' 09:00', sentAt: fmt(addDays(TODAY, -1)) + ' 09:01' },
      { label: '3-hour reminder', channel: 'sms', deliveryStatus: 'scheduled', scheduledFor: fmt(TODAY) + ' 06:00' },
      { label: '1-hour reminder', channel: 'phone', deliveryStatus: 'scheduled', scheduledFor: fmt(TODAY) + ' 08:00' },
    ],
  },
  {
    apptId: 'a2', patient: 'Jose dela Cruz',
    date: fmt(TODAY), time: '10:30', service: 'Composite Restoration',
    tiers: [
      { label: '48-hour reminder', channel: 'email', deliveryStatus: 'failed', scheduledFor: fmt(addDays(TODAY, -2)) + ' 10:30' },
      { label: '24-hour reminder', channel: 'email', deliveryStatus: 'delivered', scheduledFor: fmt(addDays(TODAY, -1)) + ' 10:30', sentAt: fmt(addDays(TODAY, -1)) + ' 10:31' },
      { label: '3-hour reminder', channel: 'sms', deliveryStatus: 'scheduled', scheduledFor: fmt(TODAY) + ' 07:30' },
      { label: '1-hour reminder', channel: 'phone', deliveryStatus: 'scheduled', scheduledFor: fmt(TODAY) + ' 09:30' },
    ],
  },
  {
    apptId: 'a3', patient: 'Ramon Aurelio Cruz',
    date: fmt(addDays(TODAY, 14)), time: '11:00', service: 'Crown Placement',
    tiers: [
      { label: '48-hour reminder', channel: 'email', deliveryStatus: 'scheduled', scheduledFor: fmt(addDays(TODAY, 12)) + ' 11:00' },
      { label: '24-hour reminder', channel: 'email', deliveryStatus: 'scheduled', scheduledFor: fmt(addDays(TODAY, 13)) + ' 11:00' },
      { label: '3-hour reminder', channel: 'sms', deliveryStatus: 'scheduled', scheduledFor: fmt(addDays(TODAY, 14)) + ' 08:00' },
      { label: '1-hour reminder', channel: 'phone', deliveryStatus: 'scheduled', scheduledFor: fmt(addDays(TODAY, 14)) + ' 10:00' },
    ],
  },
];

const RESCHEDULE_REQUESTS: RescheduleRequest[] = [
  {
    id: 'r1', type: 'reschedule',
    patient: 'Ramon Aurelio Cruz', patientId: 'P-1156',
    currentDate: fmt(addDays(TODAY, 3)), currentTime: '09:30', service: 'Crown Placement',
    requestedDate: fmt(addDays(TODAY, 14)), requestedTime: '11:00',
    reason: 'Work conflict on original date',
    requestedAt: fmt(TODAY) + ' 08:15',
    status: 'pending', policyCheck: 'pass',
    policyNote: '3 days from now — meets the 7-day advance requirement.',
    reservationPaid: 3000,
  },
  {
    id: 'r2', type: 'cancellation',
    patient: 'Lorna dela Cruz', patientId: 'P-0743',
    currentDate: fmt(addDays(TODAY, 1)), currentTime: '14:00', service: 'Root Canal Treatment',
    reason: 'Travel emergency',
    requestedAt: fmt(TODAY) + ' 07:50',
    status: 'pending', policyCheck: 'fail',
    policyNote: 'Cancellation requested less than 2 days before appointment. Reservation fee will be forfeited per policy.',
    reservationPaid: 2400,
  },
  {
    id: 'r3', type: 'reschedule',
    patient: 'Ana Kristina Reyes', patientId: 'P-1042',
    currentDate: fmt(addDays(TODAY, 5)), currentTime: '10:00', service: 'Dental Examination',
    requestedDate: fmt(addDays(TODAY, 20)), requestedTime: '09:00',
    reason: 'Scheduling conflict',
    requestedAt: fmt(addDays(TODAY, -1)) + ' 14:22',
    status: 'rejected', policyCheck: 'fail',
    policyNote: 'Reschedule request made less than 7 days before appointment. Policy: minimum 7 days advance notice required.',
    reservationPaid: 100,
  },
];

const RECALL_PATIENTS: RecallPatient[] = [
  { patientId: 'P-0400', patient: 'Santos, Benedicto R.', lastTreatment: 'Dental Prophylaxis', lastVisit: '2026-03-15', recommendedBy: '2026-09-15', recallStatus: 'due', daysOverdue: 9, recallSent: false },
  { patientId: 'P-0612', patient: 'Villanueva, Celestine M.', lastTreatment: 'Composite Restoration', lastVisit: '2026-01-10', recommendedBy: '2026-07-10', recallStatus: 'overdue', daysOverdue: 76, recallSent: true },
  { patientId: 'P-0289', patient: 'Navarro, Eduardo F.', lastTreatment: 'Root Canal Treatment', lastVisit: '2025-11-20', recommendedBy: '2026-05-20', recallStatus: 'overdue', daysOverdue: 127, recallSent: true },
  { patientId: 'P-0544', patient: 'Mercado, Florentina J.', lastTreatment: 'Dental Examination', lastVisit: '2026-04-05', recommendedBy: '2026-10-05', recallStatus: 'due', daysOverdue: 0, recallSent: false },
];

const RECALL_LOG: RecallLogEntry[] = [
  { id: 'rl1', patient: 'Villanueva, Celestine M.', dateSent: '2026-09-01', statusAtSend: 'overdue', response: 'no-response' },
  { id: 'rl2', patient: 'Navarro, Eduardo F.', dateSent: '2026-09-01', statusAtSend: 'overdue', response: 'declined' },
  { id: 'rl3', patient: 'Santos, Benedicto R.', dateSent: '2026-08-20', statusAtSend: 'due', response: 'booked' },
  { id: 'rl4', patient: 'Navarro, Eduardo F.', dateSent: '2026-07-15', statusAtSend: 'overdue', response: 'no-response' },
];

/* ── Shared UI atoms ── */

function php(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-base font-semibold text-clinical-900 font-display">{title}</h2>
        {subtitle && <p className="text-xs text-clinical-500 mt-0.5 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const APPT_STATUS_STYLES: Record<ApptStatus, string> = {
  confirmed: 'bg-success-50 text-success-700 border-success-100',
  pending: 'bg-warning-50 text-warning-700 border-warning-100',
  completed: 'bg-clinical-100 text-clinical-600 border-clinical-200',
  cancelled: 'bg-alert-50 text-alert-700 border-alert-100',
  'no-show': 'bg-alert-50 text-alert-700 border-alert-100',
};

function ApptStatusPill({ status }: { status: ApptStatus }) {
  const labels: Record<ApptStatus, string> = { confirmed: 'Confirmed', pending: 'Pending', completed: 'Completed', cancelled: 'Cancelled', 'no-show': 'No-Show' };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${APPT_STATUS_STYLES[status]}`}>{labels[status]}</span>;
}

const DELIVERY_STYLES: Record<ReminderDelivery, string> = {
  scheduled: 'bg-clinical-100 text-clinical-600 border-clinical-200',
  sent: 'bg-primary-50 text-primary-600 border-primary-100',
  delivered: 'bg-primary-50 text-primary-700 border-primary-200',
  read: 'bg-success-50 text-success-700 border-success-100',
  failed: 'bg-alert-50 text-alert-700 border-alert-100',
  cancelled: 'bg-clinical-50 text-clinical-400 border-clinical-100 line-through',
};

function DeliveryBadge({ status }: { status: ReminderDelivery }) {
  const icons: Record<ReminderDelivery, string> = { scheduled: '⏱', sent: '📤', delivered: '✓', read: '✓✓', failed: '✕', cancelled: '—' };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${DELIVERY_STYLES[status]}`}>
      {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   MODULE 1 — APPOINTMENTS OVERVIEW
══════════════════════════════════════════════════════════ */

function AppointmentsModule() {
  const [appts, setAppts] = useState<Appointment[]>(APPOINTMENTS);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInForm, setWalkInForm] = useState({ patient: '', service: '', time: '' });
  const [addingWalkIn, setAddingWalkIn] = useState(false);
  const [filterDate, setFilterDate] = useState(fmt(TODAY));

  const todayAppts = appts.filter(a => a.date === filterDate);
  const upcoming = appts.filter(a => a.date > filterDate && a.status !== 'cancelled');
  const failedCount = REMINDER_DATA.flatMap(r => r.tiers).filter(t => t.deliveryStatus === 'failed').length;

  const handleWalkIn = () => {
    setAddingWalkIn(true);
    setTimeout(() => {
      const newAppt: Appointment = {
        id: `a${Date.now()}`, patient: walkInForm.patient || 'Walk-in Patient',
        patientId: 'WALK-IN', service: walkInForm.service || 'Dental Examination',
        duration: '30 min', price: 500, date: fmt(TODAY),
        time: walkInForm.time || '15:00', status: 'confirmed', reservationPaid: 0,
      };
      setAppts(p => [...p, newAppt]);
      setAddingWalkIn(false); setShowWalkIn(false);
      setWalkInForm({ patient: '', service: '', time: '' });
    }, 800);
  };

  const OPEN_SLOTS = ['08:30', '11:00', '13:30', '16:00'];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Appointments Overview"
        subtitle="Live master calendar for Dr. Maria Reyes · Premier Dental Solutions PH"
        action={
          <div className="flex gap-2">
            {failedCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-alert-50 border border-alert-200 rounded-lg text-xs font-semibold text-alert-700">
                <IconAlert className="w-3.5 h-3.5" /> {failedCount} reminder failure{failedCount > 1 ? 's' : ''}
              </div>
            )}
            <button onClick={() => setShowWalkIn(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 text-white text-xs font-semibold rounded-lg hover:bg-primary-800 transition-colors">
              <IconPlus className="w-3.5 h-3.5" /> Walk-In
            </button>
          </div>
        }
      />

      {/* Date filter */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-clinical-700">Viewing:</label>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="text-sm border border-clinical-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500" />
        <button onClick={() => setFilterDate(fmt(TODAY))}
          className="text-xs font-medium text-primary-600 hover:text-primary-800">Today</button>
      </div>

      {/* Today's appointments */}
      <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-clinical-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-clinical-700">
            {filterDate === fmt(TODAY) ? "Today's Schedule" : `Schedule for ${filterDate}`}
          </p>
          <span className="text-[10px] text-clinical-400">{todayAppts.length} appointment{todayAppts.length !== 1 ? 's' : ''}</span>
        </div>
        {todayAppts.length === 0 ? (
          <div className="py-10 text-center">
            <IconCalendar className="w-8 h-8 text-clinical-200 mx-auto mb-2" />
            <p className="text-xs text-clinical-400">No appointments scheduled for this date.</p>
          </div>
        ) : (
          <div className="divide-y divide-clinical-50">
            {todayAppts.map(appt => (
              <AppointmentRow key={appt.id} appt={appt} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-clinical-100">
            <p className="text-xs font-semibold text-clinical-700">Upcoming Appointments</p>
          </div>
          <div className="divide-y divide-clinical-50">
            {upcoming.slice(0, 5).map(appt => (
              <AppointmentRow key={appt.id} appt={appt} />
            ))}
          </div>
        </div>
      )}

      {/* Walk-in modal */}
      {showWalkIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-clinical-900">Assign Walk-In to Open Slot</h3>
                <p className="text-[11px] text-clinical-500 mt-0.5">One-click assignment to any open slot today</p>
              </div>
              <button onClick={() => setShowWalkIn(false)}><IconX className="w-5 h-5 text-clinical-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-clinical-700 mb-1">Patient Name</label>
                <input value={walkInForm.patient} onChange={e => setWalkInForm(p => ({ ...p, patient: e.target.value }))}
                  placeholder="Full name or 'Walk-in'"
                  className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-clinical-700 mb-1">Service</label>
                <input value={walkInForm.service} onChange={e => setWalkInForm(p => ({ ...p, service: e.target.value }))}
                  placeholder="e.g. Dental Examination"
                  className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-clinical-700 mb-1">Open Slots — Today</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {OPEN_SLOTS.map(t => (
                    <button key={t} onClick={() => setWalkInForm(p => ({ ...p, time: t }))}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                        walkInForm.time === t
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : 'bg-success-50 border-success-200 text-success-700 hover:bg-success-100'
                      }`}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowWalkIn(false)} className="flex-1 py-2 border border-clinical-200 text-xs font-semibold text-clinical-700 rounded-lg">Cancel</button>
              <button onClick={handleWalkIn} disabled={addingWalkIn || !walkInForm.time}
                className="flex-1 py-2 bg-primary-700 text-white text-xs font-semibold rounded-lg hover:bg-primary-800 disabled:opacity-60 flex items-center justify-center gap-1.5">
                {addingWalkIn ? <IconLoader className="w-3.5 h-3.5" /> : 'Assign Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentRow({ appt }: { appt: Appointment }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-clinical-50 transition-colors">
      <div className="w-12 text-center shrink-0">
        <p className="text-sm font-bold text-clinical-800">{appt.time}</p>
        <p className="text-[10px] text-clinical-400">{appt.duration}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-clinical-900">{appt.patient}</p>
          <span className="text-[10px] font-mono text-clinical-400 bg-clinical-100 px-1 rounded">{appt.patientId}</span>
        </div>
        <p className="text-xs text-clinical-500 mt-0.5">{appt.service}</p>
      </div>
      <div className="text-right shrink-0">
        <ApptStatusPill status={appt.status} />
        {appt.reservationPaid > 0 && (
          <p className="text-[10px] text-success-600 mt-0.5">Res. {php(appt.reservationPaid)}</p>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CHANNEL PREVIEW MOCKUPS
══════════════════════════════════════════════════════════ */

type PreviewTier = '48h' | '24h' | '3h' | '1h';

const PREVIEW_META: Record<PreviewTier, {
  channel: 'email' | 'sms';
  subject?: string;
  smsText?: string;
}> = {
  '48h': {
    channel: 'email',
    subject: 'Your appointment is tomorrow — Root Canal Treatment at Premier Dental PH',
  },
  '24h': {
    channel: 'email',
    subject: 'Reminder: Your appointment is in 24 hours — Premier Dental Solutions PH',
  },
  '3h': {
    channel: 'sms',
    smsText: 'Premier Dental PH: Hi Ana! Your Root Canal Treatment appointment is TODAY at 2:00 PM at our Makati Branch. See you soon! Reply STOP to opt out.',
  },
  '1h': {
    channel: 'sms',
    smsText: 'Premier Dental PH: Your appointment starts in 1 HOUR — Root Canal Treatment at 2:00 PM, Makati Branch. Please head over now. Reply STOP to opt out.',
  },
};

function EmailMockup({ tier, onClose }: { tier: '48h' | '24h'; onClose: () => void }) {
  const meta = PREVIEW_META[tier];
  const isThisWeek = tier === '48h';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal chrome */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-clinical-200 bg-clinical-50 shrink-0">
          <p className="text-xs font-semibold text-clinical-700">
            Channel Preview — {tier === '48h' ? '48-hour' : '24-hour'} Email Reminder
          </p>
          <button onClick={onClose} className="p-1 rounded hover:bg-clinical-200 transition-colors">
            <IconX className="w-4 h-4 text-clinical-500" />
          </button>
        </div>

        {/* Email client frame */}
        <div className="flex-1 overflow-y-auto bg-[#f6f8fa]">
          {/* Email header bar — mimics a mail client header */}
          <div className="bg-white border-b border-[#e1e4e8] px-5 py-4">
            <p className="text-base font-semibold text-[#24292e] leading-snug">{meta.subject}</p>
            <div className="mt-2 flex items-start gap-3">
              {/* Sender avatar */}
              <div className="w-8 h-8 rounded-full bg-[#0056b3] flex items-center justify-center text-white text-[11px] font-bold shrink-0">PD</div>
              <div className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#24292e]">Premier Dental Solutions PH</span>
                  <span className="text-[#6a737d]">&lt;noreply@premierdental.ph&gt;</span>
                </div>
                <p className="text-[#6a737d] mt-0.5">
                  to: patient@email.com ·{' '}
                  {isThisWeek ? 'Yesterday, 9:01 AM' : 'Today, 9:01 AM'}
                </p>
              </div>
            </div>
          </div>

          {/* Email body */}
          <div className="px-5 py-5">
            <div className="bg-white rounded-xl border border-[#e1e4e8] overflow-hidden max-w-md mx-auto">
              {/* Clinic banner */}
              <div className="bg-[#003d7a] px-6 py-5 flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                  {/* Simple tooth SVG inline */}
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                    <path d="M12 2C8.5 2 5 4.5 5 8c0 2 .8 3.8 2 5l1 7h1l1-5h4l1 5h1l1-7c1.2-1.2 2-3 2-5 0-3.5-3.5-6-7-6z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Premier Dental Solutions PH</p>
                  <p className="text-[#a8c6e8] text-[11px]">Makati Branch</p>
                </div>
              </div>

              {/* Body text */}
              <div className="px-6 py-5 space-y-4">
                <p className="text-[13px] text-[#24292e]">Hi Ana,</p>
                <p className="text-[13px] text-[#24292e] leading-relaxed">
                  {tier === '48h'
                    ? 'This is a friendly reminder that you have an upcoming dental appointment tomorrow.'
                    : 'This is a reminder that your appointment is in less than 24 hours. Please make sure to arrive on time.'}
                </p>

                {/* Appointment detail card */}
                <div className="bg-[#f0f6ff] border border-[#c8dcf5] rounded-xl p-4 space-y-2 text-[12px]">
                  <p className="font-bold text-[#003d7a] text-[13px]">Appointment Details</p>
                  {[
                    { icon: '🦷', label: 'Service', value: 'Root Canal Treatment' },
                    { icon: '📅', label: 'Date', value: tier === '48h' ? 'Friday, October 3, 2026' : 'Today, October 4, 2026' },
                    { icon: '🕐', label: 'Time', value: '2:00 PM' },
                    { icon: '📍', label: 'Branch', value: 'Makati Branch — Premier Dental Solutions PH' },
                    { icon: '👨‍⚕️', label: 'Dentist', value: 'Dr. Maria Reyes' },
                  ].map(row => (
                    <div key={row.label} className="flex items-start gap-2">
                      <span className="shrink-0">{row.icon}</span>
                      <span className="text-[#6a737d] w-14 shrink-0">{row.label}</span>
                      <span className="text-[#24292e] font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="text-center pt-1">
                  <a href="#" onClick={e => e.preventDefault()}
                    className="inline-block bg-[#0056b3] text-white text-[12px] font-semibold px-6 py-2.5 rounded-lg no-underline">
                    View / Manage Appointment
                  </a>
                </div>

                <p className="text-[11px] text-[#6a737d] leading-relaxed">
                  If you need to reschedule or cancel, please do so at least{' '}
                  {tier === '48h' ? '7 days' : '2 days'} before your appointment to avoid fees. Questions? Reply to this email or call our clinic.
                </p>
              </div>

              {/* Email footer */}
              <div className="bg-[#f6f8fa] border-t border-[#e1e4e8] px-6 py-3 text-[10px] text-[#6a737d] text-center space-y-0.5">
                <p>Premier Dental Solutions PH · Makati, Metro Manila</p>
                <p>You received this because you have an upcoming appointment. <a href="#" onClick={e => e.preventDefault()} className="underline">Unsubscribe</a></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SmsMockup({ tier, onClose }: { tier: '3h' | '1h'; onClose: () => void }) {
  const meta = PREVIEW_META[tier];
  const timeLabel = tier === '3h' ? '3-hour' : '1-hour';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal chrome */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-clinical-200 bg-clinical-50 shrink-0">
          <p className="text-xs font-semibold text-clinical-700">
            Channel Preview — {timeLabel} SMS Reminder
          </p>
          <button onClick={onClose} className="p-1 rounded hover:bg-clinical-200 transition-colors">
            <IconX className="w-4 h-4 text-clinical-500" />
          </button>
        </div>

        {/* Phone frame */}
        <div className="flex-1 overflow-y-auto bg-[#f2f2f7] p-5 flex justify-center">
          <div className="w-64 bg-[#1c1c1e] rounded-[36px] shadow-2xl overflow-hidden" style={{ paddingBottom: '12px' }}>
            {/* Phone status bar */}
            <div className="bg-[#1c1c1e] px-5 pt-4 pb-1 flex items-center justify-between">
              <span className="text-white text-[11px] font-semibold">9:47</span>
              <div className="flex items-center gap-1">
                {/* Signal bars */}
                <svg width="16" height="10" viewBox="0 0 16 10" fill="white" opacity="0.9">
                  <rect x="0" y="6" width="3" height="4" rx="0.5"/>
                  <rect x="4.5" y="4" width="3" height="6" rx="0.5"/>
                  <rect x="9" y="2" width="3" height="8" rx="0.5"/>
                  <rect x="13.5" y="0" width="3" height="10" rx="0.5" opacity="0.4"/>
                </svg>
                {/* Battery */}
                <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
                  <rect x="0.5" y="0.5" width="18" height="11" rx="2.5" stroke="white" strokeOpacity="0.7"/>
                  <rect x="2" y="2" width="12" height="8" rx="1" fill="white" fillOpacity="0.9"/>
                  <path d="M19.5 4v4a1.5 1.5 0 000-4z" fill="white" fillOpacity="0.4"/>
                </svg>
              </div>
            </div>

            {/* Messages app header */}
            <div className="bg-[#1c1c1e] px-4 pt-1 pb-3 text-center border-b border-[#2c2c2e]">
              <p className="text-[#8e8e93] text-[10px]">Messages</p>
              <p className="text-white font-semibold text-sm mt-0.5">Premier Dental PH</p>
              <p className="text-[#8e8e93] text-[10px]">+63 2 8XXX XXXX · {tier === '3h' ? 'Today 11:00 AM' : 'Today 1:00 PM'}</p>
            </div>

            {/* Message bubbles area */}
            <div className="bg-[#000000] min-h-[220px] px-3 py-4 flex flex-col gap-2">
              {/* Date separator */}
              <div className="text-center">
                <span className="text-[#8e8e93] text-[10px]">Today</span>
              </div>

              {/* Incoming SMS bubble */}
              <div className="flex items-end gap-1.5">
                {/* Contact avatar */}
                <div className="w-6 h-6 rounded-full bg-[#2c2c2e] flex items-center justify-center text-[9px] font-bold text-[#8e8e93] shrink-0">PD</div>
                <div className="max-w-[200px] bg-[#1c1c1e] rounded-2xl rounded-bl-sm px-3 py-2.5">
                  <p className="text-white text-[11px] leading-relaxed">{meta.smsText}</p>
                </div>
              </div>

              {/* Delivery indicator */}
              <p className="text-[#8e8e93] text-[9px] ml-8">Delivered · {tier === '3h' ? '11:00 AM' : '1:00 PM'}</p>
            </div>

            {/* Message input bar */}
            <div className="bg-[#1c1c1e] px-3 py-2 flex items-center gap-2">
              <div className="flex-1 bg-[#2c2c2e] rounded-full px-3 py-1.5 flex items-center">
                <span className="text-[#48484a] text-[11px]">iMessage</span>
              </div>
              <div className="w-6 h-6 rounded-full bg-[#0a84ff] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODULE 2 — APPOINTMENT REMINDER & NOTIFICATION
══════════════════════════════════════════════════════════ */

const TIER_PREVIEW_KEY: PreviewTier[] = ['48h', '24h', '3h', '1h'];

function RemindersModule() {
  const [reminders] = useState<AppointmentReminders[]>(REMINDER_DATA);
  const [preview, setPreview] = useState<PreviewTier | null>(null);
  const failedTiers = reminders.flatMap(r =>
    r.tiers.filter(t => t.deliveryStatus === 'failed').map(t => ({ ...t, patient: r.patient, service: r.service }))
  );

  const CHANNEL_ICON: Record<ReminderChannel, string> = { email: '✉️', sms: '📱', phone: '📞' };

  return (
    <div className="space-y-5">
      {/* Preview modals */}
      {preview === '48h' && <EmailMockup tier="48h" onClose={() => setPreview(null)} />}
      {preview === '24h' && <EmailMockup tier="24h" onClose={() => setPreview(null)} />}
      {preview === '3h' && <SmsMockup tier="3h" onClose={() => setPreview(null)} />}
      {preview === '1h' && <SmsMockup tier="1h" onClose={() => setPreview(null)} />}

      <SectionHeader
        title="Appointment Reminders & Notifications"
        subtitle="4-tier automated reminder series per appointment. Delivery status logged individually. Failed deliveries flagged below."
      />

      {/* Failed delivery alert — shown on doctor's dashboard */}
      {failedTiers.length > 0 && (
        <div className="p-3.5 bg-alert-50 border border-alert-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <IconAlert className="w-4 h-4 text-alert-600 shrink-0" />
            <p className="text-xs font-semibold text-alert-700">{failedTiers.length} Failed Reminder Delivery — Doctor Dashboard Alert</p>
          </div>
          {failedTiers.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-alert-600 ml-6">
              <span>•</span>
              <span><strong>{t.patient}</strong> — {t.label} ({t.channel}) · Scheduled: {t.scheduledFor}</span>
            </div>
          ))}
          <p className="text-[10px] text-alert-500 mt-2 ml-6">Staff should follow up manually with affected patients.</p>
        </div>
      )}

      {/* Per-appointment reminder tracker */}
      <div className="space-y-4">
        {reminders.map(r => (
          <div key={r.apptId} className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-3 border-b border-clinical-100 bg-clinical-50">
              <div>
                <p className="text-sm font-semibold text-clinical-900">{r.patient}</p>
                <p className="text-xs text-clinical-500">{r.service} · {r.date} at {r.time}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                {r.tiers.some(t => t.deliveryStatus === 'failed') && (
                  <span className="text-[10px] font-bold text-alert-600 bg-alert-50 border border-alert-100 px-2 py-0.5 rounded">⚠ Failure</span>
                )}
                <IconBell className="w-4 h-4 text-clinical-400" />
              </div>
            </div>

            {/* Instant confirmation — fires immediately on booking */}
            <div className="flex items-center gap-4 px-4 py-2.5 bg-success-50/40 border-b border-clinical-50">
              <div className="w-5 h-5 rounded-full bg-success-100 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-clinical-800">Instant Confirmation</span>
                  <span className="text-base">✉️</span>
                  <span className="text-[10px] text-clinical-400">email</span>
                  <span className="text-[10px] font-semibold text-success-600 bg-success-50 border border-success-100 px-1.5 py-0.5 rounded ml-1">Sent on Booking</span>
                </div>
                <p className="text-[10px] text-clinical-400 mt-0.5">Sent immediately upon successful payment · Contains booking ref, service, date/time, and 4-tier reminder schedule</p>
              </div>
              <DeliveryBadge status="sent" />
            </div>

            {/* 4-tier reminder grid */}
            <div className="divide-y divide-clinical-50">
              {r.tiers.map((tier, i) => (
                <div key={i} className={`flex items-center gap-4 px-4 py-2.5 ${tier.deliveryStatus === 'failed' ? 'bg-alert-50/30' : ''}`}>
                  <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-700 shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-clinical-800">{tier.label}</span>
                      <span className="text-base">{CHANNEL_ICON[tier.channel]}</span>
                      <span className="text-[10px] text-clinical-400 capitalize">{tier.channel}</span>
                    </div>
                    <p className="text-[10px] text-clinical-400 mt-0.5">
                      Scheduled: {tier.scheduledFor}
                      {tier.sentAt && ` · Sent: ${tier.sentAt}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <DeliveryBadge status={tier.deliveryStatus} />
                    <button
                      onClick={() => setPreview(TIER_PREVIEW_KEY[i])}
                      className="text-[10px] font-semibold text-primary-600 hover:text-primary-800 hover:underline transition-colors whitespace-nowrap">
                      Preview ↗
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-2.5 bg-clinical-50 border-t border-clinical-100 text-[10px] text-clinical-400">
              Remaining scheduled reminders update to reflect any changes to the appointment date or time.
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-clinical-200 p-4">
        <p className="text-xs font-semibold text-clinical-700 mb-3">4-Tier Reminder Series — Per Documentation</p>
        <div className="space-y-2">
          {[
            { tier: '1', label: '48 hours before', channel: 'Email', trigger: 'On booking confirmation', pk: '48h' as PreviewTier },
            { tier: '2', label: '24 hours before', channel: 'Email', trigger: 'Auto-scheduled on booking', pk: '24h' as PreviewTier },
            { tier: '3', label: '3 hours before', channel: 'SMS', trigger: 'Auto-scheduled on booking', pk: '3h' as PreviewTier },
            { tier: '4', label: '1 hour before', channel: 'Phone / SMS', trigger: 'Auto-scheduled on booking', pk: '1h' as PreviewTier },
          ].map(r => (
            <div key={r.tier} className="flex items-center gap-3 text-xs">
              <span className="w-5 h-5 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center text-[10px] font-bold text-primary-700 shrink-0">{r.tier}</span>
              <span className="font-medium text-clinical-800 w-32 shrink-0">{r.label}</span>
              <span className="text-[11px] text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">{r.channel}</span>
              <span className="text-clinical-400 flex-1">{r.trigger}</span>
              <button onClick={() => setPreview(r.pk)}
                className="text-[10px] font-semibold text-primary-600 hover:text-primary-800 hover:underline transition-colors">
                Preview ↗
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODULE 3 — RESCHEDULING & CANCELLATION (read-only log)
══════════════════════════════════════════════════════════ */

/* Extend mock data with resolved outcomes for the log */
const RESCHEDULE_LOG = RESCHEDULE_REQUESTS.map(r => ({
  ...r,
  /* The system resolved these; no doctor action */
  resolvedStatus: r.policyCheck === 'pass' ? 'approved' : 'rejected',
  resolvedAt: r.requestedAt.replace('08:15', '08:15').replace('07:50', '07:51').replace('14:22', '14:22'),
  slotStatus: r.policyCheck === 'pass'
    ? (r.type === 'reschedule' ? 'released · new slot assigned' : 'released')
    : 'unchanged',
  billingAction: r.type === 'cancellation' && r.policyCheck === 'pass'
    ? 'Refund request forwarded to Billing'
    : r.type === 'cancellation' && r.policyCheck === 'fail'
      ? 'Fee forfeiture logged by Billing'
      : '—',
}));

type LogEntry = typeof RESCHEDULE_LOG[number];

const OUTCOME_STYLES: Record<string, string> = {
  approved: 'bg-success-50 text-success-700 border-success-100',
  rejected: 'bg-alert-50 text-alert-700 border-alert-100',
};

function RescheduleModule() {
  const [filter, setFilter] = useState<'all' | 'reschedule' | 'cancellation'>('all');

  const rows = filter === 'all' ? RESCHEDULE_LOG : RESCHEDULE_LOG.filter(r => r.type === filter);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Reschedule & Cancellation Log"
        subtitle="Policy outcomes and slot/billing actions per request. Reschedule rule: 7 days advance notice. Cancellation rule: 2 days advance notice."
      />

      {/* Filter tabs */}
      <div className="flex gap-1 bg-clinical-100 p-1 rounded-lg w-fit text-xs">
        {(['all', 'reschedule', 'cancellation'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md font-semibold capitalize transition-all ${filter === f ? 'bg-white text-clinical-800 shadow-sm' : 'text-clinical-500 hover:text-clinical-700'}`}>
            {f === 'all' ? 'All Events' : f === 'reschedule' ? 'Reschedules' : 'Cancellations'}
          </button>
        ))}
      </div>

      {/* Log table */}
      <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-clinical-100 bg-clinical-50">
              <th className="px-4 py-2.5 text-left font-semibold text-clinical-600">Patient</th>
              <th className="px-4 py-2.5 text-left font-semibold text-clinical-600">Type</th>
              <th className="px-4 py-2.5 text-left font-semibold text-clinical-600">Requested</th>
              <th className="px-4 py-2.5 text-left font-semibold text-clinical-600">Policy Outcome</th>
              <th className="px-4 py-2.5 text-left font-semibold text-clinical-600">Slot Status</th>
              <th className="px-4 py-2.5 text-left font-semibold text-clinical-600">Billing Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-clinical-50">
            {rows.map((row: LogEntry) => (
              <tr key={row.id} className="hover:bg-clinical-50/50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-clinical-900">{row.patient}</p>
                  <p className="text-[10px] font-mono text-clinical-400">{row.patientId}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${
                    row.type === 'reschedule' ? 'bg-primary-50 text-primary-700 border-primary-100' : 'bg-warning-50 text-warning-700 border-warning-100'
                  }`}>{row.type}</span>
                  <p className="text-[10px] text-clinical-400 mt-0.5">{row.service}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-clinical-700">{row.requestedAt}</p>
                  <p className="text-[10px] text-clinical-400 mt-0.5">
                    {row.currentDate} {row.currentTime}
                    {row.requestedDate && ` → ${row.requestedDate}`}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${OUTCOME_STYLES[row.resolvedStatus]}`}>
                    {row.resolvedStatus}
                  </span>
                  <p className="text-[10px] text-clinical-400 mt-0.5">{row.policyNote}</p>
                </td>
                <td className="px-4 py-3 text-[11px] text-clinical-600 capitalize">{row.slotStatus}</td>
                <td className="px-4 py-3 text-[11px] text-clinical-500">{row.billingAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-xs text-clinical-400">No events to show for this filter.</p>
          </div>
        )}
      </div>

      {/* Policy reference — display only */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: '📅', title: 'Reschedule Rule', pass: '≥ 7 days advance notice: request approved, new slot assigned.', fail: '< 7 days advance notice: request rejected, patient notified.' },
          { icon: '❌', title: 'Cancellation Rule', pass: '≥ 2 days advance notice: refund request forwarded to Billing.', fail: '< 2 days advance notice: reservation fee forfeited, logged by Billing.' },
        ].map(p => (
          <div key={p.title} className="bg-clinical-50 border border-clinical-200 rounded-xl p-3.5 text-xs">
            <p className="font-semibold text-clinical-700 flex items-center gap-1.5 mb-1.5">{p.icon} {p.title}</p>
            <p className="text-success-700">✓ {p.pass}</p>
            <p className="text-alert-600 mt-1">✕ {p.fail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODULE 4 — SCHEDULE & CONFLICT MANAGEMENT
══════════════════════════════════════════════════════════ */

type CalendarView = 'month' | 'week' | 'day';

const HOURS = Array.from({ length: 9 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

/* Mock density per day-of-month for the current month */
const DAY_DENSITY: Record<number, number> = {
  1: 3, 2: 0, 3: 5, 4: 8, 5: 6, 6: 4, 7: 0,
  8: 7, 9: 6, 10: 3, 11: 8, 12: 5, 13: 2, 14: 0,
  15: 4, 16: 7, 17: 6, 18: 5, 19: 3, 20: 8, 21: 0,
  22: 6, 23: 7, 24: 8, 25: 5, 26: 4, 27: 3, 28: 0,
  29: 2, 30: 5,
};

function densityColor(n: number): string {
  if (n === 0) return 'bg-clinical-100';
  if (n <= 3) return 'bg-success-200';
  if (n <= 6) return 'bg-warning-300';
  return 'bg-alert-400';
}

const WEEK_APPTS = [
  { day: 0, time: '09:00', patient: 'Ana Reyes', service: 'Prophylaxis', status: 'confirmed' as ApptStatus },
  { day: 0, time: '10:30', patient: 'Jose Cruz', service: 'Composite', status: 'confirmed' as ApptStatus },
  { day: 1, time: '14:00', patient: 'M. Santos', service: 'Root Canal', status: 'confirmed' as ApptStatus },
  { day: 3, time: '09:30', patient: 'R. Cruz', service: 'Crown', status: 'pending' as ApptStatus },
];


const DENTISTS = ['Dr. Maria Reyes', 'Dr. Carlo Mendoza', 'Dr. Luz Santos'];

function ScheduleModule() {
  const [view, setView] = useState<CalendarView>('month');
  const [filterDentist, setFilterDentist] = useState(DENTISTS[0]);
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const startDow = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const DOW7 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Schedule & Conflict Management"
        subtitle="Master calendar — one per dentist/branch. Conflict detection runs automatically on every booking, reschedule, and cancellation request. Supports Day / Week / Month views."
        action={
          <div className="flex rounded-lg border border-clinical-200 overflow-hidden text-xs">
            {(['day', 'week', 'month'] as CalendarView[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 font-semibold capitalize transition-colors ${view === v ? 'bg-primary-700 text-white' : 'bg-white text-clinical-600 hover:bg-clinical-50'}`}>
                {v}
              </button>
            ))}
          </div>
        }
      />

      {/* Dentist filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold text-clinical-500 shrink-0">Dentist</label>
          <select
            value={filterDentist}
            onChange={e => setFilterDentist(e.target.value)}
            className="text-xs border border-clinical-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 text-clinical-800">
            {DENTISTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-clinical-400 bg-clinical-50 border border-clinical-100 rounded-lg px-2.5 py-1.5">
          <svg className="w-3 h-3 text-clinical-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Showing calendar for <strong className="text-clinical-600 ml-0.5">{filterDentist}</strong>
        </div>
      </div>

      {/* Month view — compact density indicator per day */}
      {view === 'month' && (
        <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-clinical-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-clinical-700">
              {today.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
            </p>
            <div className="flex items-center gap-3 text-[10px]">
              {[['bg-success-200', 'Light (1-3)'], ['bg-warning-300', 'Moderate (4-6)'], ['bg-alert-400', 'Heavy (7-8+)'], ['bg-clinical-100', 'No bookings']].map(([cls, lbl]) => (
                <span key={lbl} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-sm ${cls}`} />{lbl}</span>
              ))}
            </div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-7 mb-1">
              {DOW7.map(d => (
                <div key={d} className={`text-center text-[10px] font-semibold py-1 ${d === 'Sun' ? 'text-clinical-300' : 'text-clinical-500'}`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                const isToday = d === today.getDate();
                const density = DAY_DENSITY[d] ?? 0;
                const isSunday = new Date(today.getFullYear(), today.getMonth(), d).getDay() === 0;
                return (
                  <div key={d} className={`relative rounded-lg p-1.5 min-h-[52px] border transition-colors ${
                    isToday ? 'border-primary-400 bg-primary-50' : isSunday ? 'border-transparent bg-clinical-50 opacity-50' : 'border-transparent hover:bg-clinical-50 cursor-pointer'
                  }`}>
                    <p className={`text-[11px] font-bold ${isToday ? 'text-primary-700' : 'text-clinical-700'}`}>{d}</p>
                    {!isSunday && (
                      <div className="mt-1 space-y-0.5">
                        <div className={`h-1.5 rounded-full ${densityColor(density)}`} style={{ width: `${Math.min(100, density * 12)}%` }} />
                        {density > 0 && (
                          <p className="text-[9px] text-clinical-400">{density} appt{density !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    )}
                    {isToday && <span className="absolute top-1 right-1.5 text-[8px] font-bold text-primary-600">TODAY</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Week view — full time-slot detail */}
      {view === 'week' && (
        <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-clinical-100">
            <p className="text-xs font-semibold text-clinical-700">Week of Sep 22–28, 2026</p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Day headers */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-clinical-100">
                <div />
                {['Mon 22', 'Tue 23', 'Wed 24', 'Thu 25', 'Fri 26', 'Sat 27', 'Sun 28'].map((d, i) => (
                  <div key={d} className={`py-2 text-center text-xs font-semibold ${i === 2 ? 'text-primary-700 bg-primary-50' : i === 6 ? 'text-clinical-300' : 'text-clinical-600'}`}>{d}</div>
                ))}
              </div>
              {/* Time rows */}
              {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-clinical-50 min-h-[44px]">
                  <div className="px-2 py-2 text-[10px] text-clinical-400 font-mono">{hour}</div>
                  {Array.from({ length: 7 }, (_, dayIdx) => {
                    const appt = WEEK_APPTS.find(a => a.day === dayIdx && a.time === hour);
                    return (
                      <div key={dayIdx} className={`relative border-l border-clinical-50 p-0.5 ${dayIdx === 2 ? 'bg-primary-50/30' : dayIdx === 6 ? 'bg-clinical-50/50' : ''}`}>
                        {appt && (
                          <div className={`h-full rounded text-[9px] font-semibold px-1 py-0.5 leading-tight ${APPT_STATUS_STYLES[appt.status]}`}>
                            <p>{appt.time}</p>
                            <p className="opacity-80 truncate">{appt.patient}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Day view — full time-slot detail */}
      {view === 'day' && (
        <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-clinical-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-clinical-700">Today · {today.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <p className="text-[11px] text-clinical-400">Dr. Maria Reyes · Premier Dental Solutions PH</p>
          </div>
          <div className="divide-y divide-clinical-50">
            {HOURS.map(hour => {
              const appt = APPOINTMENTS.find(a => a.date === fmt(TODAY) && a.time === hour);
              return (
                <div key={hour} className="flex items-stretch min-h-[52px]">
                  <div className="w-16 px-3 py-3 text-[11px] font-mono text-clinical-400 border-r border-clinical-100 shrink-0">{hour}</div>
                  <div className="flex-1 px-3 py-2">
                    {appt ? (
                      <div className={`flex items-center gap-2 p-2 rounded-lg border ${APPT_STATUS_STYLES[appt.status]}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{appt.patient}</p>
                          <p className="text-[10px] opacity-80">{appt.service} · {appt.duration}</p>
                        </div>
                        <ApptStatusPill status={appt.status} />
                      </div>
                    ) : (
                      <div className="h-full flex items-center">
                        <span className="text-[10px] text-clinical-300">Open slot</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODULE 5 — PATIENT RECALL & REAPPOINTMENT TRACKING
══════════════════════════════════════════════════════════ */

/* Per-patient recall timeline events for the detail drawer */
interface RecallTimelineEvent {
  date: string;
  event: string;
  type: 'flagged' | 'message-sent' | 'response' | 'escalated';
}

const RECALL_TIMELINES: Record<string, RecallTimelineEvent[]> = {
  'Santos, Benedicto R.': [
    { date: '2026-09-15', event: 'Flagged Due — recommended visit date reached (6-month prophylaxis interval)', type: 'flagged' },
    { date: '2026-09-15', event: 'Recall message auto-sent', type: 'message-sent' },
    { date: '2026-09-18', event: 'Patient responded — appointment booked', type: 'response' },
  ],
  'Villanueva, Celestine M.': [
    { date: '2026-07-10', event: 'Flagged Due — recommended visit date reached', type: 'flagged' },
    { date: '2026-07-10', event: 'Recall message auto-sent', type: 'message-sent' },
    { date: '2026-09-10', event: 'Escalated to Overdue — 2 months past Due date with no booking', type: 'escalated' },
    { date: '2026-09-01', event: 'Repeat recall message auto-sent', type: 'message-sent' },
    { date: '2026-09-15', event: 'No response recorded', type: 'response' },
  ],
  'Navarro, Eduardo F.': [
    { date: '2026-05-20', event: 'Flagged Due — 6-month follow-up after root canal', type: 'flagged' },
    { date: '2026-05-20', event: 'Recall message auto-sent', type: 'message-sent' },
    { date: '2026-07-15', event: 'No response — escalated to Overdue', type: 'escalated' },
    { date: '2026-07-15', event: 'Repeat recall message auto-sent', type: 'message-sent' },
    { date: '2026-07-20', event: 'Patient declined — responded "not available this year"', type: 'response' },
    { date: '2026-09-01', event: 'Third recall message auto-sent (2nd overdue cycle)', type: 'message-sent' },
    { date: '2026-09-10', event: 'No response recorded', type: 'response' },
  ],
  'Mercado, Florentina J.': [
    { date: '2026-10-05', event: 'Recall Due date approaching — 6-month examination interval', type: 'flagged' },
    { date: '2026-10-05', event: 'Recall message scheduled for auto-send on Due date', type: 'message-sent' },
  ],
};

const RESPONSE_STYLES: Record<RecallLogEntry['response'], string> = {
  booked: 'bg-success-50 text-success-700 border-success-100',
  'no-response': 'bg-clinical-100 text-clinical-500 border-clinical-200',
  declined: 'bg-alert-50 text-alert-700 border-alert-100',
  pending: 'bg-warning-50 text-warning-700 border-warning-100',
};

const TIMELINE_STYLES: Record<RecallTimelineEvent['type'], { dot: string; label: string }> = {
  'flagged':      { dot: 'bg-warning-400', label: 'Flagged' },
  'message-sent': { dot: 'bg-primary-500', label: 'Message sent' },
  'response':     { dot: 'bg-success-500', label: 'Response' },
  'escalated':    { dot: 'bg-alert-500', label: 'Escalated' },
};

function PatientDrawer({ patient, onClose }: { patient: RecallPatient; onClose: () => void }) {
  const timeline = RECALL_TIMELINES[patient.patient] ?? [];
  const patientLog = RECALL_LOG.filter(e => e.patient === patient.patient);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-sm bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-clinical-200 bg-clinical-50 shrink-0">
          <div>
            <p className="text-sm font-semibold text-clinical-900">{patient.patient}</p>
            <p className="text-[10px] font-mono text-clinical-400">{patient.patientId}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-clinical-200 transition-colors">
            <IconX className="w-4 h-4 text-clinical-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Current status summary */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-clinical-500 uppercase tracking-wide">Current Status</p>
            <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
              patient.recallStatus === 'overdue' ? 'bg-alert-50 border-alert-200 text-alert-700' : 'bg-warning-50 border-warning-200 text-warning-700'
            }`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${patient.recallStatus === 'overdue' ? 'bg-alert-600' : 'bg-warning-500'}`} />
              <div>
                <span className="font-bold uppercase">{patient.recallStatus}</span>
                {patient.recallStatus === 'overdue' && patient.daysOverdue > 0 && (
                  <span className="ml-1.5 font-normal">— {patient.daysOverdue} days past recommended date</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-clinical-50 rounded-xl p-2.5 border border-clinical-100">
                <p className="text-[10px] text-clinical-400 mb-0.5">Last Visit</p>
                <p className="font-semibold text-clinical-800">{patient.lastVisit}</p>
                <p className="text-[10px] text-clinical-500 mt-0.5">{patient.lastTreatment}</p>
              </div>
              <div className="bg-clinical-50 rounded-xl p-2.5 border border-clinical-100">
                <p className="text-[10px] text-clinical-400 mb-0.5">Recall Due Date</p>
                <p className="font-semibold text-clinical-800">{patient.recommendedBy}</p>
                {patient.daysOverdue > 0 && <p className="text-[10px] text-alert-500 mt-0.5">{patient.daysOverdue}d overdue</p>}
              </div>
            </div>
          </div>

          {/* Recall timeline */}
          <div>
            <p className="text-[10px] font-semibold text-clinical-500 uppercase tracking-wide mb-3">Recall Timeline</p>
            {timeline.length === 0 ? (
              <p className="text-xs text-clinical-400">No events yet.</p>
            ) : (
              <div className="relative space-y-0">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-3 bottom-3 w-px bg-clinical-200" />
                {timeline.map((event, i) => (
                  <div key={i} className="flex gap-3 relative pb-4 last:pb-0">
                    <div className={`w-5 h-5 rounded-full border-2 border-white shadow-sm shrink-0 mt-0.5 relative z-10 flex items-center justify-center ${TIMELINE_STYLES[event.type].dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-clinical-500">{event.date}</p>
                      <p className="text-xs text-clinical-800 mt-0.5 leading-snug">{event.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recall log for this patient */}
          {patientLog.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-clinical-500 uppercase tracking-wide mb-2">Message Log</p>
              <div className="space-y-1.5">
                {patientLog.map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 text-xs bg-clinical-50 rounded-xl px-3 py-2 border border-clinical-100">
                    <span className="text-clinical-400">{entry.dateSent}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize ${
                      entry.statusAtSend === 'overdue' ? 'bg-alert-50 text-alert-700 border-alert-100' : 'bg-warning-50 text-warning-700 border-warning-100'
                    }`}>{entry.statusAtSend}</span>
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border ${RESPONSE_STYLES[entry.response]}`}>
                      {entry.response === 'no-response' ? 'No Response' : entry.response.charAt(0).toUpperCase() + entry.response.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function RecallModule() {
  const [patients] = useState<RecallPatient[]>(RECALL_PATIENTS);
  const [recallLog] = useState<RecallLogEntry[]>(RECALL_LOG);
  const [drawerPatient, setDrawerPatient] = useState<RecallPatient | null>(null);

  /* History log filters */
  const [filterStatus, setFilterStatus] = useState<'all' | 'due' | 'overdue'>('all');
  const [filterResponse, setFilterResponse] = useState<'all' | 'booked' | 'no-response' | 'declined' | 'pending'>('all');

  const dueCount = patients.filter(p => p.recallStatus === 'due').length;
  const overdueCount = patients.filter(p => p.recallStatus === 'overdue').length;

  const filteredLog = recallLog.filter(e =>
    (filterStatus === 'all' || e.statusAtSend === filterStatus) &&
    (filterResponse === 'all' || e.response === filterResponse)
  );

  const openDrawer = (patientId: string) => {
    const p = patients.find(x => x.patientId === patientId);
    if (p) setDrawerPatient(p);
  };

  const openDrawerByName = (name: string) => {
    const p = patients.find(x => x.patient === name);
    if (p) setDrawerPatient(p);
  };

  return (
    <div className="space-y-5">
      {drawerPatient && <PatientDrawer patient={drawerPatient} onClose={() => setDrawerPatient(null)} />}

      <SectionHeader
        title="Patient Recall & Reappointment Tracking"
        subtitle="Tracks patients by recall status. Due = recommended visit date reached; Overdue = Due + 2 months with no booking."
      />

      {/* Status legend */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Due', color: 'bg-warning-50 border-warning-200', dot: 'bg-warning-500', rule: 'Recommended visit date reached.' },
          { label: 'Overdue', color: 'bg-alert-50 border-alert-200', dot: 'bg-alert-600', rule: 'Due + 2 months with no booking.' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 text-xs ${s.color}`}>
            <p className="font-semibold text-clinical-800 flex items-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} /> {s.label}
            </p>
            <p className="text-clinical-600">{s.rule}</p>
          </div>
        ))}
      </div>

      {/* Screen 1 — Recall Dashboard */}
      <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-clinical-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-clinical-700">Recall Dashboard — Current Status</p>
            <p className="text-[10px] text-clinical-400 mt-0.5">Click any row to view that patient's recall timeline.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-warning-600 font-semibold bg-warning-50 border border-warning-100 px-2 py-0.5 rounded">{dueCount} Due</span>
            <span className="text-[10px] text-alert-600 font-semibold bg-alert-50 border border-alert-100 px-2 py-0.5 rounded">{overdueCount} Overdue</span>
          </div>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-clinical-50 bg-clinical-50">
              <th className="px-4 py-2.5 text-left font-semibold text-clinical-600">Patient</th>
              <th className="px-4 py-2.5 text-left font-semibold text-clinical-600">Last Treatment</th>
              <th className="px-4 py-2.5 text-left font-semibold text-clinical-600">Last Visit</th>
              <th className="px-4 py-2.5 text-left font-semibold text-clinical-600">Next Recommended</th>
              <th className="px-4 py-2.5 text-left font-semibold text-clinical-600">Days Overdue</th>
              <th className="px-4 py-2.5 text-left font-semibold text-clinical-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-clinical-50">
            {patients.map(p => (
              <tr key={p.patientId}
                onClick={() => openDrawer(p.patientId)}
                className="hover:bg-primary-50/30 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-clinical-900">{p.patient}</p>
                  <p className="text-[10px] font-mono text-clinical-400">{p.patientId}</p>
                </td>
                <td className="px-4 py-3 text-clinical-600">{p.lastTreatment}</td>
                <td className="px-4 py-3 text-clinical-600">{p.lastVisit}</td>
                <td className="px-4 py-3 text-clinical-600">{p.recommendedBy}</td>
                <td className="px-4 py-3">
                  {p.daysOverdue > 0
                    ? <span className="text-alert-600 font-semibold">{p.daysOverdue}d</span>
                    : <span className="text-clinical-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    p.recallStatus === 'overdue' ? 'bg-alert-50 text-alert-700 border-alert-100' : 'bg-warning-50 text-warning-700 border-warning-100'
                  }`}>{p.recallStatus}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Screen 2 — Recall History Log with filters */}
      <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-clinical-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-clinical-700">Recall History Log</p>
              <p className="text-[10px] text-clinical-400 mt-0.5">Auto-populated as the system sends recalls. Click a row to open that patient's detail drawer.</p>
            </div>
            <span className="text-[10px] text-clinical-400 shrink-0">{filteredLog.length} / {recallLog.length} entries</span>
          </div>
          {/* Filters */}
          <div className="flex gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-clinical-500">Status:</span>
              {(['all', 'due', 'overdue'] as const).map(f => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md border capitalize transition-all ${filterStatus === f ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-clinical-500 border-clinical-200 hover:border-clinical-400'}`}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-clinical-500">Response:</span>
              {(['all', 'booked', 'no-response', 'declined', 'pending'] as const).map(f => (
                <button key={f} onClick={() => setFilterResponse(f)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md border capitalize transition-all ${filterResponse === f ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-clinical-500 border-clinical-200 hover:border-clinical-400'}`}>
                  {f === 'all' ? 'All' : f === 'no-response' ? 'No Response' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-clinical-50 bg-clinical-50">
              <th className="px-4 py-2 text-left font-semibold text-clinical-600">Patient</th>
              <th className="px-4 py-2 text-left font-semibold text-clinical-600">Date Sent</th>
              <th className="px-4 py-2 text-left font-semibold text-clinical-600">Status at Time</th>
              <th className="px-4 py-2 text-left font-semibold text-clinical-600">Response Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-clinical-50">
            {filteredLog.map(entry => (
              <tr key={entry.id}
                onClick={() => openDrawerByName(entry.patient)}
                className="hover:bg-primary-50/30 cursor-pointer transition-colors">
                <td className="px-4 py-2.5 font-medium text-clinical-800">{entry.patient}</td>
                <td className="px-4 py-2.5 text-clinical-500">{entry.dateSent}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${
                    entry.statusAtSend === 'overdue' ? 'bg-alert-50 text-alert-700 border-alert-100' : 'bg-warning-50 text-warning-700 border-warning-100'
                  }`}>{entry.statusAtSend}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${RESPONSE_STYLES[entry.response]}`}>
                    {entry.response === 'no-response' ? 'No Response' : entry.response.charAt(0).toUpperCase() + entry.response.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
            {filteredLog.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-clinical-400">No entries match the selected filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ROOT SCHEDULING VIEW
══════════════════════════════════════════════════════════ */

const MODULES = [
  { id: 'appointments', label: 'Appointments' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'reschedule', label: 'Reschedule & Cancel' },
  { id: 'calendar', label: 'Master Calendar' },
  { id: 'recall', label: 'Patient Recall' },
] as const;

type SchedulingModule = typeof MODULES[number]['id'];

export default function Scheduling() {
  const [activeModule, setActiveModule] = useState<SchedulingModule>('appointments');
  const failedCount = REMINDER_DATA.flatMap(r => r.tiers).filter(t => t.deliveryStatus === 'failed').length;

  return (
    <div className="flex flex-col h-full">
      {/* Sub-navigation */}
      <div className="bg-white border-b border-clinical-200 px-6 pt-5 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-clinical-900 font-display">Appointment & Scheduling</h1>
            <p className="text-xs text-clinical-500">Premier Dental Solutions PH · Single Clinic · Dr. Maria Reyes</p>
          </div>
          {failedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-alert-50 border border-alert-200 rounded-lg text-xs font-semibold text-alert-700">
              <IconAlert className="w-3.5 h-3.5" /> {failedCount} reminder failure{failedCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
        <div className="flex gap-0.5 overflow-x-auto">
          {MODULES.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveModule(id)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                activeModule === id ? 'border-primary-600 text-primary-700' : 'border-transparent text-clinical-500 hover:text-clinical-700 hover:border-clinical-300'
              }`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeModule === 'appointments' && <AppointmentsModule />}
        {activeModule === 'reminders' && <RemindersModule />}
        {activeModule === 'reschedule' && <RescheduleModule />}
        {activeModule === 'calendar' && <ScheduleModule />}
        {activeModule === 'recall' && <RecallModule />}
      </div>
    </div>
  );
}
