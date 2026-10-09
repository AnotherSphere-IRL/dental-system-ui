import { useState, useMemo } from 'react';
import {
  IconCalendar, IconClock, IconCheck, IconX, IconAlert,
} from '../icons';
import { useClinic } from '../../context/ClinicContext';

/* ══════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════ */

type Screen =
  | 'list'
  | 'reschedule-picker'   // screen 2a — ≥7 days (allowed)
  | 'reschedule-blocked'  // screen 2b — <7 days (rejected)
  | 'cancel-confirm'      // screen 3a — ≥2 days (refund eligible)
  | 'cancel-forfeit'      // screen 3b — <2 days (fee forfeited)
  | 'outcome';            // screen 4

type OutcomeType = 'rescheduled' | 'cancelled-refund' | 'cancelled-forfeit';

interface PatientAppointment {
  id: string;
  service: string;
  dentist: string;
  date: string;
  time: string;
  branch: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  reservationFee: number;
}

interface HistoryEntry {
  id: string;
  type: 'reschedule' | 'cancellation';
  service: string;
  originalDate: string;
  newDate?: string;
  outcome: 'rescheduled' | 'cancelled-refund' | 'cancelled-forfeit';
  processedAt: string;
}

/* ── Mock data ── */

const TODAY = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const UPCOMING_APPT: PatientAppointment = {
  id: 'pa-1',
  service: 'Root Canal Treatment',
  dentist: 'Dr. Maria Reyes',
  date: fmt(addDays(TODAY, 12)),
  time: '14:00',
  branch: 'Premier Dental Solutions PH — Makati Branch',
  status: 'confirmed',
  reservationFee: 2400,
};

const PAST_HISTORY: HistoryEntry[] = [
  {
    id: 'h1', type: 'reschedule', service: 'Dental Prophylaxis',
    originalDate: '2026-07-10', newDate: '2026-07-24',
    outcome: 'rescheduled', processedAt: '2026-07-02 09:14',
  },
  {
    id: 'h2', type: 'cancellation', service: 'Composite Restoration',
    originalDate: '2026-05-20',
    outcome: 'cancelled-refund', processedAt: '2026-05-10 15:30',
  },
];

/* ── Month-view calendar helpers ── */

type DayStatus = 'open' | 'limited' | 'full' | 'closed' | 'past';

const DAY_STATUS_STYLES: Record<DayStatus, string> = {
  open:    'bg-success-50 border-success-200 text-clinical-800 hover:border-success-400 cursor-pointer',
  limited: 'bg-warning-50 border-warning-200 text-clinical-800 hover:border-warning-400 cursor-pointer',
  full:    'bg-clinical-100 border-clinical-200 text-clinical-400 cursor-not-allowed',
  closed:  'bg-clinical-50 border-clinical-100 text-clinical-300 cursor-not-allowed',
  past:    'bg-white border-clinical-100 text-clinical-300 cursor-not-allowed opacity-50',
};

const STATUS_DOT: Record<DayStatus, string> = {
  open:    'bg-success-500',
  limited: 'bg-warning-500',
  full:    'bg-clinical-400',
  closed:  'bg-clinical-200',
  past:    'bg-transparent',
};

const STATUS_LABEL: Record<DayStatus, string> = {
  open: 'Open', limited: 'Limited', full: 'Full', closed: 'Closed', past: '',
};

function buildMonthAvailability(year: number, month: number): Record<number, DayStatus> {
  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result: Record<number, DayStatus> = {};
  const PATTERN: DayStatus[] = ['open', 'open', 'limited', 'full', 'open', 'closed', 'closed', 'limited', 'open', 'full'];
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    const isPast = new Date(year, month, d) < today && !(year === today.getFullYear() && month === today.getMonth() && d === today.getDate());
    if (isPast) { result[d] = 'past'; continue; }
    if (dow === 0) { result[d] = 'closed'; continue; }
    result[d] = PATTERN[(d + month) % PATTERN.length];
  }
  return result;
}

function buildDaySlots(status: DayStatus): string[] {
  if (status === 'open') return ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];
  if (status === 'limited') return ['09:00', '14:00'];
  return [];
}

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function PolicyBadge({ type, days }: { type: 'reschedule' | 'cancel'; days: number }) {
  const pass = type === 'reschedule' ? days >= 7 : days >= 2;
  const message = type === 'reschedule'
    ? pass
      ? `${days} days before appointment — reschedule is allowed.`
      : `Only ${days} day${days !== 1 ? 's' : ''} before appointment — reschedule requires at least 7 days advance notice.`
    : pass
      ? `${days} days before appointment — cancellation with refund is eligible.`
      : `Only ${days} day${days !== 1 ? 's' : ''} before appointment — cancellation within 2 days forfeits the reservation fee.`;

  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
      pass ? 'bg-success-50 border-success-200 text-success-700' : 'bg-alert-50 border-alert-200 text-alert-700'
    }`}>
      {pass
        ? <IconCheck className="w-4 h-4 shrink-0 mt-0.5" />
        : <IconAlert className="w-4 h-4 shrink-0 mt-0.5" />}
      <div>
        <p className="font-semibold">Policy check: {pass ? 'PASS' : 'FAIL'}</p>
        <p className="mt-0.5">{message}</p>
      </div>
    </div>
  );
}

function OutcomeIcon({ outcome }: { outcome: OutcomeType }) {
  if (outcome === 'rescheduled') {
    return (
      <div className="w-14 h-14 rounded-full bg-success-100 flex items-center justify-center mx-auto">
        <IconCalendar className="w-7 h-7 text-success-600" />
      </div>
    );
  }
  return (
    <div className="w-14 h-14 rounded-full bg-clinical-100 flex items-center justify-center mx-auto">
      <IconCheck className="w-7 h-7 text-clinical-500" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   RESCHEDULE CALENDAR
══════════════════════════════════════════════════════════ */

interface RescheduleCalendarProps {
  viewMonth: { year: number; month: number };
  onChangeMonth: (m: { year: number; month: number }) => void;
  selectedDate: string | null;
  selectedSlot: string | null;
  onSelectDate: (d: string) => void;
  onSelectSlot: (s: string) => void;
}

function RescheduleCalendar({ viewMonth, onChangeMonth, selectedDate, selectedSlot, onSelectDate, onSelectSlot }: RescheduleCalendarProps) {
  const { year, month } = viewMonth;
  const DOW7 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = new Date(year, month, 1).getDay();
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

  const availability = useMemo(() => buildMonthAvailability(year, month), [year, month]);

  const prevMonth = () => {
    const d = new Date(year, month - 1, 1);
    onChangeMonth({ year: d.getFullYear(), month: d.getMonth() });
  };
  const nextMonth = () => {
    const d = new Date(year, month + 1, 1);
    onChangeMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  const selectedDayNum = selectedDate ? parseInt(selectedDate.split('-')[2]) : null;
  const selectedMonthStr = selectedDate ? selectedDate.slice(0, 7) : null;
  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const slots = selectedDate && selectedMonthStr === currentMonthStr
    ? buildDaySlots(availability[selectedDayNum!] ?? 'closed')
    : [];

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-clinical-700">Select New Date & Time</p>

      {/* Availability legend */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] text-clinical-500">
        {(['open', 'limited', 'full', 'closed'] as DayStatus[]).map(s => (
          <span key={s} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-clinical-100">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-clinical-100 transition-colors text-clinical-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <p className="text-xs font-semibold text-clinical-800">{monthLabel}</p>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-clinical-100 transition-colors text-clinical-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <div className="p-3">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DOW7.map(d => (
              <div key={d} className={`text-center text-[9px] font-semibold py-1 ${d === 'Sun' ? 'text-clinical-300' : 'text-clinical-500'}`}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const status = availability[d] ?? 'closed';
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isSelected = selectedDate === dateStr;
              const isSelectable = status === 'open' || status === 'limited';

              return (
                <button
                  key={d}
                  disabled={!isSelectable}
                  onClick={() => isSelectable && onSelectDate(dateStr)}
                  className={`relative rounded-lg p-1.5 min-h-[48px] border transition-all text-left ${
                    isSelected
                      ? 'bg-primary-700 border-primary-700 text-white'
                      : DAY_STATUS_STYLES[status]
                  }`}>
                  <p className={`text-[11px] font-bold ${isSelected ? 'text-white' : ''}`}>{d}</p>
                  {status !== 'past' && (
                    <div className="mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${isSelected ? 'bg-white/70' : STATUS_DOT[status]}`} />
                      <p className={`text-[8px] leading-tight mt-0.5 ${isSelected ? 'text-white/80' : 'text-clinical-400'}`}>
                        {STATUS_LABEL[status]}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Time slot drill-down */}
      {selectedDate && selectedMonthStr === currentMonthStr && (
        <div className="bg-white rounded-xl border border-primary-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-primary-100 bg-primary-50">
            <p className="text-xs font-semibold text-primary-700">
              Available slots — {new Date(selectedDate + 'T12:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {slots.length === 0 ? (
            <p className="px-4 py-3 text-xs text-clinical-400">No available slots on this day.</p>
          ) : (
            <div className="flex flex-wrap gap-2 p-4">
              {slots.map(slot => (
                <button key={slot}
                  onClick={() => onSelectSlot(slot)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    selectedSlot === slot
                      ? 'bg-primary-700 text-white border-primary-700'
                      : 'bg-success-50 text-success-700 border-success-200 hover:bg-success-100'
                  }`}>{slot}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════ */

interface Props {
  onBookNew: () => void;
  isDemo?: boolean;
}

export default function MyAppointments({ onBookNew, isDemo = false }: Props) {
  const { submitCancellationRequest } = useClinic();
  const [screen, setScreen] = useState<Screen>('list');
  const [appt] = useState<PatientAppointment>(UPCOMING_APPT);
  const [history, setHistory] = useState<HistoryEntry[]>(PAST_HISTORY);

  /* Reschedule picker state — month-view calendar */
  const [viewMonth, setViewMonth] = useState({ year: TODAY.getFullYear(), month: TODAY.getMonth() });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  /* Cancel state */
  const [cancelConfirmed, setCancelConfirmed] = useState(false);

  /* Outcome state */
  const [outcome, setOutcome] = useState<OutcomeType | null>(null);
  const [outcomeDetail, setOutcomeDetail] = useState<{ newDate?: string; newTime?: string }>({});

  /* Processing */
  const [processing, setProcessing] = useState(false);
  const [previewDays, setPreviewDays] = useState<number | null>(null);

  const days = daysUntil(appt.date);
  const policyDays = previewDays ?? days;
  const canReschedule = days >= 7;
  const canRefund = days >= 2;

  /* ── Handlers ── */

  const handleRescheduleClick = () => {
    setPreviewDays(null);
    setSelectedDate(null); setSelectedSlot(null);
    setScreen(canReschedule ? 'reschedule-picker' : 'reschedule-blocked');
  };

  const handleCancelClick = () => {
    setPreviewDays(null);
    setCancelConfirmed(false);
    setScreen(canRefund ? 'cancel-confirm' : 'cancel-forfeit');
  };

  const openPreview = (nextScreen: Screen, simulatedDays: number) => {
    setPreviewDays(simulatedDays);
    setSelectedDate(null);
    setSelectedSlot(null);
    setCancelConfirmed(false);
    setScreen(nextScreen);
  };

  const handleConfirmReschedule = () => {
    if (!selectedDate || !selectedSlot) return;
    setProcessing(true);
    setTimeout(() => {
      const entry: HistoryEntry = {
        id: `h${Date.now()}`, type: 'reschedule', service: appt.service,
        originalDate: appt.date, newDate: selectedDate,
        outcome: 'rescheduled', processedAt: new Date().toLocaleString('en-PH'),
      };
      setHistory(p => [entry, ...p]);
      setOutcome('rescheduled');
      setOutcomeDetail({ newDate: selectedDate, newTime: selectedSlot });
      setProcessing(false);
      setScreen('outcome');
    }, 1000);
  };

  const handleConfirmCancel = (type: 'refund' | 'forfeit') => {
    setProcessing(true);
    setTimeout(() => {
      submitCancellationRequest({
        patient: 'Ana Kristina Reyes',
        patientId: 'P-1042',
        appointmentId: appt.id,
        service: appt.service,
        appointmentDate: appt.date,
        appointmentTime: appt.time,
        reason: type === 'refund' ? 'Patient requested cancellation within refundable window' : 'Patient requested late cancellation',
        paymentReference: type === 'refund' ? 'TXN-20260910-001' : undefined,
      });
      const outcomeVal: OutcomeType = type === 'refund' ? 'cancelled-refund' : 'cancelled-forfeit';
      const entry: HistoryEntry = {
        id: `h${Date.now()}`, type: 'cancellation', service: appt.service,
        originalDate: appt.date,
        outcome: outcomeVal, processedAt: new Date().toLocaleString('en-PH'),
      };
      setHistory(p => [entry, ...p]);
      setOutcome(outcomeVal);
      setOutcomeDetail({});
      setProcessing(false);
      setScreen('outcome');
    }, 1000);
  };

  /* ══════════════════════════════════════════════════════
     SCREEN 1 — My Appointment (entry point)
  ══════════════════════════════════════════════════════ */
  if (screen === 'list') return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-clinical-900 font-display">My Appointments</h2>
          <p className="text-xs text-clinical-500 mt-0.5">Upcoming and past appointments</p>
        </div>
        <button onClick={onBookNew}
          className="px-3 py-1.5 bg-primary-700 text-white text-xs font-semibold rounded-lg hover:bg-primary-800 transition-colors">
          + Book New
        </button>
      </div>

      {/* ── NEW USER: empty state ── */}
      {!isDemo && (
        <div className="bg-clinical-50 border border-dashed border-clinical-200 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-clinical-100 flex items-center justify-center mx-auto">
            <IconCalendar className="w-6 h-6 text-clinical-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-clinical-600">No appointments yet</p>
            <p className="text-xs text-clinical-400 mt-1 leading-relaxed">
              Book your first appointment to get started with your dental care.
            </p>
          </div>
          <button onClick={onBookNew}
            className="px-5 py-2.5 bg-primary-700 text-white text-sm font-semibold rounded-xl hover:bg-primary-800 transition-colors">
            Book First Appointment
          </button>
        </div>
      )}

      {/* ── DEMO: Upcoming appointment card ── */}
      {isDemo && (
      <>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => openPreview('reschedule-picker', 7)}
          className="px-3 py-2 border border-clinical-200 rounded-lg text-xs font-medium text-clinical-700 hover:bg-clinical-50">
          Preview: Reschedule Approved
        </button>
        <button onClick={() => openPreview('reschedule-blocked', 6)}
          className="px-3 py-2 border border-clinical-200 rounded-lg text-xs font-medium text-clinical-700 hover:bg-clinical-50">
          Preview: Reschedule Rejected
        </button>
        <button onClick={() => openPreview('cancel-confirm', 2)}
          className="px-3 py-2 border border-clinical-200 rounded-lg text-xs font-medium text-clinical-700 hover:bg-clinical-50">
          Preview: Cancel Refunded
        </button>
        <button onClick={() => openPreview('cancel-forfeit', 1)}
          className="px-3 py-2 border border-clinical-200 rounded-lg text-xs font-medium text-clinical-700 hover:bg-clinical-50">
          Preview: Cancel Forfeited
        </button>
      </div>

      {/* Upcoming appointment card */}
      <div className="bg-white rounded-2xl border border-primary-200 overflow-hidden shadow-sm">
        <div className="px-4 py-2 bg-primary-700 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse" />
          <p className="text-[11px] font-semibold text-primary-100">Upcoming Appointment</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-lg font-bold text-clinical-900 font-display">{appt.service}</p>
          <p className="text-sm text-primary-700 font-medium mt-0.5">{appt.dentist}</p>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-clinical-600">
              <IconCalendar className="w-3.5 h-3.5 text-clinical-400 shrink-0" />
              <span>{formatDate(appt.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-clinical-600">
              <IconClock className="w-3.5 h-3.5 text-clinical-400 shrink-0" />
              <span>{appt.time}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-clinical-600">
              <svg className="w-3.5 h-3.5 text-clinical-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{appt.branch}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-clinical-100 flex gap-2">
            <button onClick={handleRescheduleClick}
              className="flex-1 py-2.5 border border-primary-300 text-primary-700 text-sm font-semibold rounded-xl hover:bg-primary-50 transition-colors">
              Reschedule
            </button>
            <button onClick={handleCancelClick}
              className="flex-1 py-2.5 border border-alert-200 text-alert-600 text-sm font-semibold rounded-xl hover:bg-alert-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* History log */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-clinical-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-clinical-100">
            <p className="text-xs font-semibold text-clinical-700">Reschedule / Cancellation History</p>
          </div>
          <div className="divide-y divide-clinical-50">
            {history.map(entry => (
              <div key={entry.id} className="flex items-center gap-4 px-5 py-3">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${
                  entry.outcome === 'rescheduled' ? 'bg-primary-500' :
                  entry.outcome === 'cancelled-refund' ? 'bg-success-500' : 'bg-alert-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-clinical-800">{entry.service}</p>
                  <p className="text-[10px] text-clinical-400 mt-0.5">
                    {entry.type === 'reschedule'
                      ? `Rescheduled from ${entry.originalDate} → ${entry.newDate}`
                      : `Cancelled · ${entry.originalDate}`}
                    {' · '}{entry.processedAt}
                  </p>
                </div>
                <OutcomePill outcome={entry.outcome} />
              </div>
            ))}
          </div>
        </div>
      )}

      </>
      )}
    </div>
  );

  /* ══════════════════════════════════════════════════════
     SCREEN 2a — Reschedule: ≥7 days (allowed)
  ══════════════════════════════════════════════════════ */
  if (screen === 'reschedule-picker') return (
    <div className="p-5 space-y-4">
      <BackButton label="Back to My Appointments" onClick={() => setScreen('list')} />

      <div>
        <h2 className="text-base font-semibold text-clinical-900 font-display">Reschedule Appointment</h2>
        <p className="text-xs text-clinical-500 mt-0.5">Choose a new date and time from available slots.</p>
      </div>

      {/* Current appointment summary */}
      <div className="bg-clinical-50 rounded-xl border border-clinical-200 px-4 py-3 text-xs text-clinical-600">
        <p className="font-semibold text-clinical-800">{appt.service}</p>
        <p className="mt-0.5">Current: {formatDate(appt.date)} at {appt.time}</p>
      </div>

      {/* Policy check — PASS */}
      <PolicyBadge type="reschedule" days={policyDays} />

      {/* Auto-approval callout */}
      <div className="flex items-center gap-2 px-3 py-2 bg-clinical-50 border border-clinical-200 rounded-xl text-[11px] text-clinical-600">
        <span className="text-sm">⚙️</span>
        <span><strong>System auto-approves</strong> — no doctor or staff action required. Your new slot will be confirmed immediately on submission.</span>
      </div>

      {/* Month-view calendar */}
      <RescheduleCalendar
        viewMonth={viewMonth}
        onChangeMonth={setViewMonth}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        onSelectDate={(d) => { setSelectedDate(d); setSelectedSlot(null); }}
        onSelectSlot={setSelectedSlot}
      />

      {/* Module boundary note */}
      <div className="bg-clinical-50 rounded-xl border border-clinical-100 p-3 text-[11px] text-clinical-500 space-y-0.5">
        <p className="font-semibold text-clinical-600">On confirmation:</p>
        <p>• Old slot (<strong>{appt.date} {appt.time}</strong>) is released back to the Master Calendar.</p>
        <p>• Reminder series will be automatically updated to the new appointment date.</p>
      </div>

      <button
        onClick={handleConfirmReschedule}
        disabled={!selectedDate || !selectedSlot || processing}
        className="w-full py-3 bg-primary-700 text-white text-sm font-semibold rounded-xl hover:bg-primary-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        {processing
          ? <><Spinner /> Processing…</>
          : selectedDate && selectedSlot
            ? `Confirm — ${selectedDate} at ${selectedSlot}`
            : 'Select a date and time to continue'}
      </button>
    </div>
  );

  /* ══════════════════════════════════════════════════════
     SCREEN 2b — Reschedule: <7 days (blocked)
  ══════════════════════════════════════════════════════ */
  if (screen === 'reschedule-blocked') return (
    <div className="p-5 space-y-4">
      <BackButton label="Back to My Appointments" onClick={() => setScreen('list')} />

      <div>
        <h2 className="text-base font-semibold text-clinical-900 font-display">Reschedule Request</h2>
        <p className="text-xs text-clinical-500 mt-0.5">{appt.service} · {formatDate(appt.date)}</p>
      </div>

      {/* Policy check — FAIL */}
      <PolicyBadge type="reschedule" days={policyDays} />

      {/* Block notice */}
      <div className="bg-alert-50 border border-alert-200 rounded-2xl p-5 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-alert-100 flex items-center justify-center mx-auto">
          <IconX className="w-6 h-6 text-alert-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-alert-700">Reschedule Not Allowed</p>
          <p className="text-xs text-alert-600 mt-1.5 leading-relaxed">
            Your appointment is <strong>{policyDays} day{policyDays !== 1 ? 's' : ''} away</strong>. Reschedule requests must be submitted at least <strong>7 days</strong> before the scheduled appointment.
          </p>
          <p className="text-xs text-alert-500 mt-2">
            This request was <strong>automatically rejected by the system</strong> — no staff review is involved. Clinic policy does not allow reschedules within 7 days of the appointment.
          </p>
        </div>
      </div>

      {/* Disabled action — visually blocked, no bypass */}
      <button disabled
        className="w-full py-3 bg-clinical-200 text-clinical-400 text-sm font-semibold rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
        <IconX className="w-4 h-4" /> Reschedule Disabled — Policy Not Met
      </button>
    </div>
  );

  /* ══════════════════════════════════════════════════════
     SCREEN 3a — Cancel: ≥2 days (refund eligible)
  ══════════════════════════════════════════════════════ */
  if (screen === 'cancel-confirm') return (
    <div className="p-5 space-y-4">
      <BackButton label="Back to My Appointments" onClick={() => setScreen('list')} />

      <div>
        <h2 className="text-base font-semibold text-clinical-900 font-display">Cancel Appointment</h2>
        <p className="text-xs text-clinical-500 mt-0.5">{appt.service} · {formatDate(appt.date)}</p>
      </div>

      {/* Policy check — PASS */}
      <PolicyBadge type="cancel" days={policyDays} />

      {/* Refund eligibility note — NO computed amount */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-xs text-primary-700 space-y-1.5">
        <p className="font-semibold flex items-center gap-1.5">
          <IconCheck className="w-3.5 h-3.5" /> Refund Eligible
        </p>
        <p>On confirmation, the system <strong>automatically triggers</strong> Billing's Refund & Fee Adjustment module — <strong>no doctor approval required</strong>.</p>
        <p className="text-primary-500">The actual refund amount (minus applicable transfer and service fees) is calculated by Billing, not here.</p>
      </div>

      {/* Explicit confirmation step */}
      <div className="bg-white border border-clinical-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-clinical-800">Confirm Cancellation</p>
        <p className="text-xs text-clinical-600 leading-relaxed">
          You are about to cancel your <strong>{appt.service}</strong> appointment on <strong>{formatDate(appt.date)}</strong> at <strong>{appt.time}</strong>.
        </p>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={cancelConfirmed} onChange={e => setCancelConfirmed(e.target.checked)}
            className="mt-0.5 accent-primary-600 w-4 h-4 shrink-0" />
          <span className="text-xs text-clinical-700">
            I understand this will cancel my appointment and submit a refund request to the clinic's billing team.
          </span>
        </label>
      </div>

      <button
        onClick={() => handleConfirmCancel('refund')}
        disabled={!cancelConfirmed || processing}
        className="w-full py-3 bg-alert-600 text-white text-sm font-semibold rounded-xl hover:bg-alert-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        {processing ? <><Spinner /> Processing…</> : 'Cancel Appointment & Request Refund'}
      </button>
    </div>
  );

  /* ══════════════════════════════════════════════════════
     SCREEN 3b — Cancel: <2 days (forfeiture)
  ══════════════════════════════════════════════════════ */
  if (screen === 'cancel-forfeit') return (
    <div className="p-5 space-y-4">
      <BackButton label="Back to My Appointments" onClick={() => setScreen('list')} />

      <div>
        <h2 className="text-base font-semibold text-clinical-900 font-display">Cancel Appointment</h2>
        <p className="text-xs text-clinical-500 mt-0.5">{appt.service} · {formatDate(appt.date)}</p>
      </div>

      {/* Policy check — FAIL */}
      <PolicyBadge type="cancel" days={policyDays} />

      {/* Forfeiture warning — NO computed amount */}
      <div className="bg-alert-50 border border-alert-300 rounded-xl p-4 text-xs text-alert-700 space-y-1.5">
        <p className="font-semibold flex items-center gap-1.5">
          <IconAlert className="w-3.5 h-3.5" /> Reservation Fee Will Be Automatically Forfeited
        </p>
        <p>
          Because this cancellation is within <strong>2 days</strong> of your appointment, the system <strong>automatically applies forfeiture</strong> per clinic policy — no approval step involved.
        </p>
        <p className="text-alert-600">The forfeiture is auto-logged by <strong>Billing's Refund & Fee Adjustment</strong> module.</p>
      </div>

      {/* Explicit confirmation — not a silent action */}
      <div className="bg-white border border-clinical-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-clinical-800">Confirm Cancellation</p>
        <p className="text-xs text-clinical-600 leading-relaxed">
          You are about to cancel your <strong>{appt.service}</strong> appointment on <strong>{formatDate(appt.date)}</strong> at <strong>{appt.time}</strong>.
        </p>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={cancelConfirmed} onChange={e => setCancelConfirmed(e.target.checked)}
            className="mt-0.5 accent-primary-600 w-4 h-4 shrink-0" />
          <span className="text-xs text-clinical-700">
            I understand that my <strong>reservation fee will be forfeited</strong> because this cancellation is inside the 2-day window.
          </span>
        </label>
      </div>

      <button
        onClick={() => handleConfirmCancel('forfeit')}
        disabled={!cancelConfirmed || processing}
        className="w-full py-3 bg-alert-600 text-white text-sm font-semibold rounded-xl hover:bg-alert-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        {processing ? <><Spinner /> Processing…</> : 'Cancel Appointment (Fee Forfeited)'}
      </button>
    </div>
  );

  /* ══════════════════════════════════════════════════════
     SCREEN 4 — Outcome
  ══════════════════════════════════════════════════════ */
  if (screen === 'outcome' && outcome) return (
    <div className="p-5 space-y-5">
      <div className="bg-white rounded-2xl border border-clinical-200 p-6 text-center space-y-3">
        <OutcomeIcon outcome={outcome} />
        <div>
          <p className="text-base font-semibold text-clinical-900 font-display">
            {outcome === 'rescheduled' ? 'Appointment Rescheduled'
              : outcome === 'cancelled-refund' ? 'Appointment Cancelled'
              : 'Appointment Cancelled'}
          </p>
          <p className={`text-xs mt-1 ${outcome === 'rescheduled' ? 'text-success-700' : 'text-clinical-600'}`}>
            {outcome === 'rescheduled'
              ? `New date: ${outcomeDetail.newDate} at ${outcomeDetail.newTime}`
              : outcome === 'cancelled-refund'
                ? 'Your refund request has been sent to the Billing team for processing.'
                : 'Your cancellation has been recorded. Reservation fee forfeiture logged by Billing.'}
          </p>
        </div>

        {/* Module boundary confirmations */}
        <div className="text-left bg-clinical-50 rounded-xl p-3 space-y-1.5 text-[11px] text-clinical-600">
          {outcome === 'rescheduled' ? (
            <>
              <p className="flex items-center gap-1.5"><IconCheck className="w-3 h-3 text-success-600 shrink-0" /> Old slot released back to Master Calendar.</p>
              <p className="flex items-center gap-1.5"><IconCheck className="w-3 h-3 text-success-600 shrink-0" /> Reminder series updated to new appointment date.</p>
            </>
          ) : outcome === 'cancelled-refund' ? (
            <>
              <p className="flex items-center gap-1.5"><IconCheck className="w-3 h-3 text-success-600 shrink-0" /> Appointment slot released to Master Calendar.</p>
              <p className="flex items-center gap-1.5"><IconCheck className="w-3 h-3 text-success-600 shrink-0" /> Refund request forwarded to Billing's Refund & Fee Adjustment module.</p>
              <p className="flex items-center gap-1.5"><IconCheck className="w-3 h-3 text-success-600 shrink-0" /> Scheduled reminders cancelled.</p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-1.5"><IconCheck className="w-3 h-3 text-success-600 shrink-0" /> Appointment slot released to Master Calendar.</p>
              <p className="flex items-center gap-1.5"><IconCheck className="w-3 h-3 text-success-600 shrink-0" /> Fee forfeiture logged by Billing's Refund & Fee Adjustment module.</p>
              <p className="flex items-center gap-1.5"><IconCheck className="w-3 h-3 text-success-600 shrink-0" /> Scheduled reminders cancelled.</p>
            </>
          )}
        </div>
      </div>

      {/* History log — visible immediately after outcome */}
      <div className="bg-white rounded-2xl border border-clinical-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-clinical-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-clinical-700">Reschedule / Cancellation History</p>
          <span className="text-[10px] text-clinical-400">{history.length} entries</span>
        </div>
        <div className="divide-y divide-clinical-50">
          {history.map((entry, i) => (
            <div key={entry.id} className={`flex items-center gap-4 px-5 py-3 ${i === 0 ? 'bg-primary-50/30' : ''}`}>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                entry.outcome === 'rescheduled' ? 'bg-primary-500' :
                entry.outcome === 'cancelled-refund' ? 'bg-success-500' : 'bg-alert-500'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-clinical-800">{entry.service}</p>
                <p className="text-[10px] text-clinical-400 mt-0.5">
                  {entry.type === 'reschedule'
                    ? `Rescheduled from ${entry.originalDate} → ${entry.newDate}`
                    : `Cancelled · ${entry.originalDate}`}
                  {i === 0 && <span className="ml-1.5 font-semibold text-primary-600">NEW</span>}
                </p>
              </div>
              <OutcomePill outcome={entry.outcome} />
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setScreen('list')}
        className="w-full py-2.5 border border-clinical-200 text-sm font-semibold text-clinical-700 rounded-xl hover:bg-clinical-50 transition-colors">
        Back to My Appointments
      </button>
    </div>
  );

  return null;
}

/* ── Atoms ── */

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-xs font-medium text-clinical-500 hover:text-clinical-700 transition-colors -ml-1">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

function OutcomePill({ outcome }: { outcome: OutcomeType }) {
  const map: Record<OutcomeType, { label: string; cls: string }> = {
    'rescheduled': { label: 'Rescheduled', cls: 'bg-primary-50 text-primary-700 border-primary-100' },
    'cancelled-refund': { label: 'Cancelled · Refund', cls: 'bg-success-50 text-success-700 border-success-100' },
    'cancelled-forfeit': { label: 'Cancelled · Forfeited', cls: 'bg-alert-50 text-alert-700 border-alert-100' },
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${map[outcome].cls}`}>
      {map[outcome].label}
    </span>
  );
}
