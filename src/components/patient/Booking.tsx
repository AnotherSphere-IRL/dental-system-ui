import { useState, useEffect } from 'react';
import {
  IconCalendar, IconClock, IconCheck, IconChevronRight,
  IconCreditCard, IconDollarSign, IconAlert, IconLoader, IconX, IconFileText
} from '../icons';
import { PAYMENT_METHODS, type PaymentMethod } from '../../constants/paymentMethods';
import { useClinic } from '../../context/ClinicContext';
import { useServiceCatalog } from '../../context/ServiceCatalogContext';

interface Props {
  onBack: () => void;
  intakeCompleted?: boolean;
  onOpenIntake?: () => void;
  initialServiceIds?: string[];
}

type DayStatus = 'open' | 'limited' | 'full' | 'closed' | 'past';

/* Mock per-day availability for current month */
function buildAvailability(): Record<string, DayStatus> {
  const today = new Date();
  const map: Record<string, DayStatus> = {};
  const year = today.getFullYear();
  const month = today.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const statuses: DayStatus[] = ['open', 'open', 'limited', 'open', 'full', 'limited', 'open'];
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month, d);
    const key = date.toISOString().slice(0, 10);
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      map[key] = 'past';
    } else if (date.getDay() === 0) {
      map[key] = 'closed';
    } else {
      map[key] = statuses[d % statuses.length];
    }
  }
  return map;
}

const AVAILABILITY = buildAvailability();

/* Time slots — in real system, fetched per selected date */
const buildSlots = (dateKey: string) => {
  const seed = dateKey.charCodeAt(dateKey.length - 1);
  const all = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];
  return all.map((t, i) => ({ time: t, available: (i + seed) % 3 !== 0 }));
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_STYLES: Record<DayStatus, string> = {
  open: 'bg-success-50 border-success-200 text-clinical-800 hover:border-success-400 cursor-pointer',
  limited: 'bg-warning-50 border-warning-200 text-clinical-800 hover:border-warning-400 cursor-pointer',
  full: 'bg-clinical-100 border-clinical-200 text-clinical-400 cursor-not-allowed',
  closed: 'bg-clinical-50 border-clinical-100 text-clinical-300 cursor-not-allowed',
  past: 'bg-white border-clinical-100 text-clinical-300 cursor-not-allowed opacity-50',
};

const STATUS_DOT: Record<DayStatus, string> = {
  open: 'bg-success-500',
  limited: 'bg-warning-500',
  full: 'bg-clinical-400',
  closed: 'bg-clinical-300',
  past: 'bg-transparent',
};

type Step = 1 | 2 | 3;

export default function Booking({ onBack, intakeCompleted = true, onOpenIntake, initialServiceIds }: Props) {
  const { payments, createPaymentRequest } = useClinic();
  const { publishedServices } = useServiceCatalog();
  const services = publishedServices.map(service => ({
    ...service,
    duration: service.category === 'Oral Surgery' ? '60 min' : service.category === 'Restorative' ? '75 min' : '45 min',
  }));
  const [step, setStep] = useState<Step>(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(initialServiceIds ?? []);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [holdSeconds, setHoldSeconds] = useState<number | null>(null);
  const [holdExpired, setHoldExpired] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('GCash');
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const [paymentTimeout, setPaymentTimeout] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);


  const selectedServices = services.filter(service => selectedServiceIds.includes(service.id));
  const serviceTotal = selectedServices.reduce((total, service) => total + service.price, 0);
  const reservationFee = Math.ceil(serviceTotal * 0.2);
  const selectedServiceNames = selectedServices.map(service => service.name).join(', ');
  const confirmationCode = 'PDS-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  /* Hold countdown — 10 minutes */
  useEffect(() => {
    setSelectedServiceIds(initialServiceIds ?? []);
  }, [initialServiceIds]);

  useEffect(() => {
    if (selectedSlot && step === 2) {
      setHoldSeconds(600);
      setHoldExpired(false);
    }
  }, [selectedSlot, step]);

  useEffect(() => {
    if (holdSeconds === null) return;
    if (holdSeconds <= 0) { setHoldExpired(true); setHoldSeconds(null); setSelectedSlot(null); return; }
    const t = setTimeout(() => setHoldSeconds(s => (s ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [holdSeconds]);

  /* Month calendar helpers */
  const firstOfMonth = new Date(viewMonth.year, viewMonth.month, 1);
  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const startDow = firstOfMonth.getDay();
  const monthLabel = firstOfMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

  const handleDayClick = (d: number) => {
    const date = new Date(viewMonth.year, viewMonth.month, d);
    const key = date.toISOString().slice(0, 10);
    const status = AVAILABILITY[key] ?? 'open';
    if (status === 'past' || status === 'closed' || status === 'full') return;
    setSelectedDateKey(key);
    setSelectedSlot(null);
    setHoldSeconds(null);
  };

  const selectedDate = selectedDateKey ? new Date(selectedDateKey + 'T00:00:00') : null;
  const timeSlots = selectedDateKey ? buildSlots(selectedDateKey) : [];

  const handlePay = () => {
    if (selectedServices.length === 0 || !selectedDateKey || !selectedSlot) return;
    setPaying(true); setPaymentError(false);
    const reference = createPaymentRequest({
      patient: 'Ana Kristina Reyes',
      patientId: 'P-1042',
      appointmentId: `APT-${selectedDateKey}-${selectedSlot}`,
      service: selectedServiceNames,
      amountDue: reservationFee,
      method: paymentMethod,
    });
    setPaymentReference(reference);
    setPaying(false);
  };

  const submittedPayment = paymentReference ? payments.find(payment => payment.reference === paymentReference) : null;

  useEffect(() => {
    if (submittedPayment?.status === 'paid') setConfirmed(true);
    if (submittedPayment?.status === 'failed') setPaymentError(true);
  }, [submittedPayment?.status]);

  const fmtHold = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* ── Intake gate: block booking until intake is completed ── */
  if (!intakeCompleted) {
    return (
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-clinical-400 hover:text-clinical-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="text-sm font-semibold text-clinical-900">Book Appointment</h2>
        </div>

        <div className="bg-warning-50 border border-warning-200 rounded-2xl p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-warning-100 flex items-center justify-center mx-auto">
            <IconAlert className="w-7 h-7 text-warning-500" />
          </div>
          <div>
            <p className="text-base font-semibold text-warning-700">Patient Intake Required</p>
            <p className="text-xs text-warning-600 mt-2 leading-relaxed">
              You need to complete your patient intake form before booking an appointment.
              This helps your dentist review your medical history and prepare for your visit.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-warning-100 p-3 text-left space-y-2">
            {[
              'Personal Information',
              'Medical History',
              'Dental History',
              'Current Symptoms & Digital Signature',
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-clinical-600">
                <div className="w-5 h-5 rounded-full bg-clinical-200 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-clinical-500">{i + 1}</span>
                </div>
                {s}
              </div>
            ))}
          </div>
          <button
            onClick={onOpenIntake}
            className="w-full py-3 bg-warning-600 text-white text-sm font-semibold rounded-xl hover:bg-warning-700 transition-colors flex items-center justify-center gap-2"
          >
            <IconFileText className="w-4 h-4" />
            Complete Patient Intake
          </button>
          <p className="text-[10px] text-warning-500">
            After completing intake, you'll be brought back here to continue booking.
          </p>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="p-5 flex flex-col items-center text-center min-h-full justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-success-50 border-4 border-success-100 flex items-center justify-center">
          <IconCheck className="w-8 h-8 text-success-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-clinical-900 font-display">Appointment Confirmed!</h2>
          <p className="font-mono text-xs text-clinical-500 mt-1 bg-clinical-50 px-3 py-1 rounded-lg border inline-block">{confirmationCode}</p>
        </div>
        <div className="w-full bg-success-50 border border-success-100 rounded-xl p-4 text-left space-y-2">
          <Row label="Services" value={selectedServiceNames} />
          <Row label="Date" value={selectedDate?.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }) ?? ''} />
          <Row label="Time" value={selectedSlot ?? ''} />
          <Row label="Reservation Fee Paid" value={`₱${reservationFee.toLocaleString()}`} highlight />
          <Row label="Balance Due at Clinic" value={`₱${(serviceTotal - reservationFee).toLocaleString()}`} />
        </div>
        {/* 4-tier reminder schedule — per Appointment Reminder & Notification module */}
        <div className="w-full p-3.5 bg-primary-50 border border-primary-100 rounded-xl text-left">
          <p className="text-xs font-semibold text-primary-700 mb-2">Reminder Schedule Activated</p>
          <div className="space-y-1 text-[11px] text-primary-700">
            {[
              { label: '48 hours before', channel: 'Email' },
              { label: '24 hours before', channel: 'Email' },
              { label: '3 hours before', channel: 'SMS' },
              { label: '1 hour before', channel: 'SMS / Phone' },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-2">
                <IconCheck className="w-3 h-3 text-success-600 shrink-0" />
                <span><strong>{r.label}</strong> via {r.channel}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full text-[10px] text-clinical-500 bg-clinical-50 border border-clinical-100 rounded-xl px-3 py-2.5 space-y-1 text-left">
          <p>✓ Confirmation sent to your registered email.</p>
          <p>✓ Slot finalized on Master Calendar.</p>
        </div>
        <button onClick={onBack}
          className="w-full py-3 bg-primary-700 text-white font-semibold text-sm rounded-xl hover:bg-primary-800 transition-colors">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Step header */}
      <div className="px-4 py-3 border-b border-clinical-100 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={onBack} className="text-clinical-400 hover:text-clinical-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="text-sm font-semibold text-clinical-900">Book Appointment</h2>
        </div>
        <div className="flex gap-1">
          {([1, 2, 3] as const).map(s => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-all ${s < step ? 'bg-success-600' : s === step ? 'bg-primary-600' : 'bg-clinical-200'}`} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-clinical-400 mt-1">
          <span className={step >= 1 ? 'text-primary-600 font-medium' : ''}>1. Service & Date</span>
          <span className={step >= 2 ? 'text-primary-600 font-medium' : ''}>2. Time Slot</span>
          <span className={step >= 3 ? 'text-primary-600 font-medium' : ''}>3. Payment</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* ── STEP 1: Service + Month-View Calendar ── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Auth-only notice */}
            <div className="flex items-center gap-2 p-2.5 bg-primary-50 border border-primary-100 rounded-xl text-[10px] text-primary-700">
              <IconCheck className="w-3.5 h-3.5 shrink-0 text-primary-600" />
              Booking as <strong>Ana Kristina Reyes</strong> · Authenticated session required
            </div>

            <div>
              <p className="text-xs font-semibold text-clinical-700 mb-2">Select Services</p>
              <div className="space-y-2">
                {services.map(svc => {
                  const isSelected = selectedServiceIds.includes(svc.id);
                  return (
                  <button key={svc.id} onClick={() => setSelectedServiceIds(current => current.includes(svc.id) ? current.filter(id => id !== svc.id) : [...current, svc.id])}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-400 ring-offset-1'
                        : 'border-clinical-200 bg-white hover:border-primary-300'
                    }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-clinical-800">{svc.name}</p>
                        <p className="text-[11px] text-clinical-500 mt-0.5">{svc.description} · {svc.duration}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-bold text-clinical-900">₱{svc.price.toLocaleString()}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-1.5 text-[10px] text-primary-600 font-medium">
                        Reservation fee: ₱{Math.ceil(svc.price * 0.2).toLocaleString()} (20%) — from Price List
                      </div>
                    )}
                  </button>
                )})}
              </div>
            </div>

            {/* Month-view calendar */}
            {selectedServiceIds.length > 0 && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-clinical-700 mb-1">Select Date</p>
                  {/* Legend */}
                  <div className="flex items-center gap-3 mb-2 text-[10px] text-clinical-500">
                    {[
                      { dot: 'bg-success-500', label: 'Open' },
                      { dot: 'bg-warning-500', label: 'Limited' },
                      { dot: 'bg-clinical-400', label: 'Full' },
                    ].map(l => (
                      <span key={l.label} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${l.dot}`} />{l.label}
                      </span>
                    ))}
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-clinical-200" />Closed</span>
                  </div>
                </div>

                {/* Calendar navigation */}
                <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-clinical-100">
                    <button onClick={() => setViewMonth(p => {
                      const d = new Date(p.year, p.month - 1, 1);
                      return { year: d.getFullYear(), month: d.getMonth() };
                    })} className="p-1 text-clinical-400 hover:text-clinical-700 rounded transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <p className="text-xs font-semibold text-clinical-800">{monthLabel}</p>
                    <button onClick={() => setViewMonth(p => {
                      const d = new Date(p.year, p.month + 1, 1);
                      return { year: d.getFullYear(), month: d.getMonth() };
                    })} className="p-1 text-clinical-400 hover:text-clinical-700 rounded transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  {/* Day-of-week headers */}
                  <div className="grid grid-cols-7 border-b border-clinical-100">
                    {DOW.map(d => (
                      <div key={d} className={`py-1.5 text-center text-[10px] font-semibold ${d === 'Sun' ? 'text-clinical-300' : 'text-clinical-500'}`}>{d}</div>
                    ))}
                  </div>

                  {/* Day grid */}
                  <div className="grid grid-cols-7 p-1.5 gap-1">
                    {/* Empty cells for offset */}
                    {Array.from({ length: startDow }).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                      const date = new Date(viewMonth.year, viewMonth.month, d);
                      const key = date.toISOString().slice(0, 10);
                      const status = AVAILABILITY[key] ?? 'open';
                      const isSelected = selectedDateKey === key;
                      const isClickable = status === 'open' || status === 'limited';
                      return (
                        <button key={d} onClick={() => handleDayClick(d)} disabled={!isClickable}
                          className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 border text-xs font-semibold transition-all aspect-square ${
                            isSelected
                              ? 'border-primary-600 bg-primary-600 text-white ring-2 ring-primary-400 ring-offset-1'
                              : STATUS_STYLES[status]
                          }`}>
                          <span>{d}</span>
                          {status !== 'past' && (
                            <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white/70' : STATUS_DOT[status]}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected date info */}
                {selectedDateKey && (
                  <div className="flex items-center gap-2 p-2.5 bg-primary-50 border border-primary-100 rounded-xl text-xs text-primary-700">
                    <IconCalendar className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      <strong>{selectedDate?.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>
                      {' · '}
                      <span className={`font-semibold ${AVAILABILITY[selectedDateKey] === 'limited' ? 'text-warning-700' : 'text-success-700'}`}>
                        {AVAILABILITY[selectedDateKey] === 'limited' ? 'Limited slots' : 'Slots available'}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Time Slots + Hold ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-3 bg-clinical-50 rounded-xl border border-clinical-200 text-xs">
              <p className="font-semibold text-clinical-700">{selectedServiceNames}</p>
              <p className="text-clinical-500 mt-0.5">
                {selectedDate?.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {holdExpired && (
              <div className="flex items-start gap-2 p-3 bg-alert-50 border border-alert-100 rounded-xl text-xs text-alert-700">
                <IconAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Hold Expired</p>
                  <p className="mt-0.5">Your slot hold timed out and has been released. Please select another time.</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-clinical-700 mb-2">Available Time Slots</p>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map(slot => (
                  <button key={slot.time} disabled={!slot.available}
                    onClick={() => slot.available && setSelectedSlot(slot.time)}
                    className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      !slot.available
                        ? 'border-clinical-100 bg-clinical-50 text-clinical-300 cursor-not-allowed'
                        : selectedSlot === slot.time
                        ? 'border-primary-500 bg-primary-600 text-white ring-2 ring-primary-400 ring-offset-1'
                        : 'border-clinical-200 bg-white text-clinical-700 hover:border-primary-400 hover:bg-primary-50'
                    }`}>
                    <span>{slot.time}</span>
                    {!slot.available && <span className="block text-[8px] opacity-60 font-normal">Booked</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Slot hold countdown */}
            {selectedSlot && holdSeconds !== null && holdSeconds > 0 && (
              <div className="p-3 bg-primary-50 border border-primary-100 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-primary-700">
                    <IconClock className="w-3.5 h-3.5" />
                    <strong>{selectedSlot}</strong> temporarily reserved for you
                  </div>
                  <span className={`font-mono font-bold text-sm tabular-nums ${holdSeconds <= 60 ? 'text-alert-700' : 'text-primary-700'}`}>
                    {fmtHold(holdSeconds)}
                  </span>
                </div>
                <p className="text-[10px] text-primary-600 mt-1">
                  Complete payment before the hold expires. If not, the slot will be auto-released and you will be notified.
                </p>
                {holdSeconds <= 60 && (
                  <p className="text-[10px] font-semibold text-alert-600 mt-1">⚠ Hold expiring soon — complete payment now!</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Payment ── */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Booking summary */}
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-clinical-700">Booking Summary</p>
              <Row label="Services" value={selectedServiceNames} />
              <Row label="Date" value={selectedDate?.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }) ?? ''} />
              <Row label="Time" value={selectedSlot ?? ''} />
              <div className="border-t border-primary-200 pt-2 space-y-1">
                <Row label="Service Price (from Price List)" value={`₱${serviceTotal.toLocaleString()}`} />
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary-800">Reservation Fee (20%)</span>
                    <p className="text-[9px] text-primary-500">Required to confirm. Slot released if payment fails.</p>
                  </div>
                  <span className="text-base font-bold text-primary-800">₱{reservationFee.toLocaleString()}</span>
                </div>
                <Row label="Balance Due at Clinic" value={`₱${(serviceTotal - reservationFee).toLocaleString()}`} />
              </div>
            </div>

            {/* Payment method — redirects to gateway */}
            <div>
              <p className="text-xs font-semibold text-clinical-700 mb-2">Payment Method</p>
              <div className="space-y-2">
                {PAYMENT_METHODS.map(method => (
                  <label key={method}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === method ? 'border-primary-500 bg-primary-50' : 'border-clinical-200 bg-white hover:border-primary-300'
                    }`}>
                    <input type="radio" name="payment" value={method} checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)} className="accent-primary-700" />
                    <span className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                      {method === 'Cash'
                        ? <IconDollarSign className="w-4 h-4" />
                        : <IconCreditCard className="w-4 h-4" />}
                    </span>
                    <span className="text-sm font-medium text-clinical-800">{method}</span>
                  </label>
                ))}
              </div>
            </div>

            {paymentError && (
              <div className="flex items-start gap-2 p-3 bg-alert-50 border border-alert-100 rounded-xl text-xs text-alert-700">
                <IconAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Payment Failed — Slot Released</p>
                  <p className="mt-0.5">Your slot hold has been released and you have been notified. Please try again or select a different method.</p>
                </div>
              </div>
            )}

            {paymentTimeout && !paymentError && (
              <div className="flex items-start gap-2 p-3 bg-warning-50 border border-warning-200 rounded-xl text-xs text-warning-700">
                <IconAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Payment Timed Out — Slot Released</p>
                  <p className="mt-0.5">The payment gateway did not receive a response within the allowed time. Your slot hold has expired and the slot has been auto-released. Please start over.</p>
                </div>
              </div>
            )}

            {submittedPayment && !paymentError && (
              <div className={`p-3 rounded-xl border text-xs ${
                submittedPayment.status === 'pending'
                  ? 'bg-warning-50 border-warning-200 text-warning-700'
                  : 'bg-primary-50 border-primary-100 text-primary-700'
              }`}>
                <p className="font-semibold">
                  {submittedPayment.status === 'pending' ? 'Payment Request Pending' :
                   'Payment Provider Processing'}
                </p>
                <p className="mt-0.5">
                  {submittedPayment.status === 'pending'
                    ? 'Prepare the exact cash amount. The appointment is confirmed only after clinic staff confirms receipt.'
                    : 'The provider result will update automatically.'}
                </p>
                <p className="font-mono text-[10px] mt-1">{submittedPayment.reference}</p>
              </div>
            )}

            {/* Demo triggers */}
            <div className="flex gap-4">
              <button onClick={() => { setPaymentError(true); setPaymentTimeout(false); }}
                className="text-[10px] text-clinical-400 underline">
                Demo: payment failure
              </button>
              <button onClick={() => { setPaymentTimeout(true); setPaymentError(false); setHoldExpired(true); setSelectedSlot(null); setHoldSeconds(null); }}
                className="text-[10px] text-clinical-400 underline">
                Demo: payment timeout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="px-4 py-4 border-t border-clinical-100 bg-white shrink-0">
        {step < 3 ? (
          <button
            onClick={() => setStep(s => (s + 1) as Step)}
            disabled={
              (step === 1 && (selectedServiceIds.length === 0 || !selectedDateKey)) ||
              (step === 2 && (!selectedSlot || holdExpired))
            }
            className="w-full py-3.5 bg-primary-700 text-white font-semibold text-sm rounded-xl hover:bg-primary-800 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            {step === 1 ? 'Select Time Slot' : 'Review & Pay'} <IconChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handlePay} disabled={paying || !!submittedPayment}
            className="w-full py-3.5 bg-success-600 text-white font-bold text-sm rounded-xl hover:bg-success-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
            {paying
              ? <><IconLoader className="w-4 h-4" /> Processing via {paymentMethod}…</>
              : <><IconCreditCard className="w-4 h-4" /> Submit ₱{reservationFee.toLocaleString()} Payment Request</>}
          </button>
        )}
        {step === 3 && !paying && (
          <p className="text-[10px] text-clinical-400 text-center mt-2">
            Booking confirmed only on successful payment · Slot auto-released if payment fails
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-clinical-500">{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-success-600' : 'text-clinical-800'}`}>{value}</span>
    </div>
  );
}
