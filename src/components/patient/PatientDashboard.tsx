import { IconClock, IconAlert, IconCheck, IconChevronRight, IconFileText, IconCalendar } from '../icons';
import type { AuthUser, IntakeData } from '../../App';

type PatientView = 'dashboard' | 'appointments' | 'health-record' | 'billing';

interface Props {
  user: AuthUser;
  isDemo: boolean;
  intakeData: IntakeData | null;
  onNavigate: (v: PatientView) => void;
  onOpenIntake: () => void;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function PatientDashboard({ onNavigate, onOpenIntake, user, isDemo, intakeData }: Props) {
  const intakeCompleted = intakeData !== null;

  return (
    <div className="p-4 space-y-4">
      {/* Greeting */}
      <div className="pt-1">
        <p className="text-xs text-clinical-500">
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="text-lg font-semibold text-clinical-900 font-display mt-0.5">Hello, {user.name}! 👋</h1>
        {!isDemo && (
          <p className="text-xs text-clinical-400 mt-0.5">Welcome to your patient portal. Let's get you set up.</p>
        )}
      </div>

      {/* ── INTAKE REMINDER (new users only) ────────────────── */}
      {!intakeCompleted && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-warning-100 flex items-center justify-center shrink-0">
              <IconFileText className="w-5 h-5 text-warning-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning-700">Complete Your Patient Intake</p>
              <p className="text-xs text-warning-600 mt-0.5 leading-relaxed">
                Please complete your medical history and digital signature before booking an appointment.
                This information helps your dentist provide safe, personalized care.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenIntake}
            className="mt-3 w-full py-2.5 bg-warning-600 text-white text-sm font-semibold rounded-lg hover:bg-warning-700 transition-colors flex items-center justify-center gap-2"
          >
            <IconFileText className="w-4 h-4" />
            Complete Patient Intake
          </button>
        </div>
      )}

      {/* ── INTAKE COMPLETED BADGE (non-demo users) ── */}
      {intakeCompleted && !isDemo && (
        <div className="flex items-center gap-3 p-3 bg-success-50 border border-success-100 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-success-100 flex items-center justify-center shrink-0">
            <IconCheck className="w-4 h-4 text-success-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-success-700">Patient Intake Completed</p>
            <p className="text-[10px] text-success-600">
              Submitted {fmtDate(intakeData!.submittedAt)} · Your dentist has been notified.
            </p>
          </div>
          <button onClick={onOpenIntake} className="text-[10px] text-success-600 hover:text-success-800 font-medium shrink-0">
            View / Update
          </button>
        </div>
      )}

      {/* ── DEMO: Amount due today ───────────────────────────── */}
      {isDemo && (
        <div className="p-4 bg-warning-50 border border-warning-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <IconAlert className="w-4 h-4 text-warning-600 shrink-0" />
            <p className="text-xs font-semibold text-warning-700 uppercase tracking-wide">Amount Due Today</p>
          </div>
          <p className="text-3xl font-bold text-warning-700">₱2,500</p>
          <p className="text-xs text-warning-600 mt-0.5">Composite Restoration — Today's appointment</p>
          <button
            onClick={() => onNavigate('billing')}
            className="mt-3 w-full py-2.5 bg-warning-600 text-white text-sm font-semibold rounded-lg hover:bg-warning-700 transition-colors"
          >
            Pay Now
          </button>
        </div>
      )}

      {/* ── DEMO: Next appointment ──────────────────────────── */}
      {isDemo && (
        <div className="bg-primary-700 rounded-xl p-4 text-white">
          <div className="flex items-center gap-1.5 text-primary-200 text-xs font-medium mb-3">
            <IconCalendar className="w-3.5 h-3.5" />
            NEXT APPOINTMENT
          </div>
          <p className="text-base font-semibold">Composite Restoration #14</p>
          <div className="flex items-center gap-1.5 mt-1 text-primary-200 text-sm">
            <IconClock className="w-4 h-4" />
            <span>Today — Sept 26, 2026 at 10:00 AM</span>
          </div>
          <div className="mt-2 text-xs text-primary-300">Dr. Maria Reyes · Premier Dental Solutions PH</div>
          <div className="flex gap-2 mt-3">
            <button className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors border border-white/20">
              Reschedule
            </button>
            <button className="flex-1 py-2 bg-white text-primary-800 text-xs font-semibold rounded-lg hover:bg-primary-50 transition-colors">
              View Details
            </button>
          </div>
        </div>
      )}

      {/* ── NEW USER: No upcoming appointments ──────────────── */}
      {!isDemo && (
        <div className="bg-clinical-50 border border-dashed border-clinical-200 rounded-xl p-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-clinical-100 flex items-center justify-center mx-auto mb-3">
            <IconCalendar className="w-5 h-5 text-clinical-400" />
          </div>
          <p className="text-sm font-medium text-clinical-600">No upcoming appointments</p>
          <p className="text-xs text-clinical-400 mt-1 leading-relaxed">
            Book your first appointment to get started with your dental care.
          </p>
          <button
            onClick={() => onNavigate('appointments')}
            className="mt-3 px-4 py-2 bg-primary-700 text-white text-xs font-semibold rounded-lg hover:bg-primary-800 transition-colors"
          >
            Book Appointment
          </button>
        </div>
      )}

      {/* ── MEDICAL ALERTS — visible whenever intake is completed ── */}
      {intakeCompleted && (
        <div className="bg-white border border-clinical-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-clinical-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-clinical-700">Medical Alerts for Your Dentist</p>
              <p className="text-[10px] text-clinical-400 mt-0.5">Patient-reported · Not a clinical diagnosis</p>
            </div>
            {intakeData!.alerts.length > 0 && (
              <span className="text-[10px] font-bold text-alert-700 bg-alert-50 border border-alert-100 px-2 py-0.5 rounded-lg">
                {intakeData!.alerts.length} flag{intakeData!.alerts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {intakeData!.alerts.length > 0 ? (
            <div className="divide-y divide-clinical-50">
              {intakeData!.alerts.map(alert => (
                <div key={alert.questionId} className="px-4 py-3 flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-alert-50 border border-alert-100 flex items-center justify-center shrink-0 mt-0.5">
                    <IconAlert className="w-3 h-3 text-alert-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-clinical-800">{alert.rule}</p>
                    {alert.detail && (
                      <p className="text-[10px] text-clinical-500 mt-0.5 italic leading-relaxed">"{alert.detail}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-success-50 flex items-center justify-center shrink-0">
                <IconCheck className="w-4 h-4 text-success-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-success-700">No Medical Alerts</p>
                <p className="text-[10px] text-success-600 mt-0.5">
                  No clinical risk flags were identified from your intake responses.
                </p>
              </div>
            </div>
          )}

          <div className="px-4 py-2.5 border-t border-clinical-50 bg-clinical-50/60">
            <p className="text-[10px] text-clinical-400 leading-relaxed">
              These flags are generated from your answers and shared with your dentist for clinical safety.
              Your dentist makes all clinical decisions — these are informational only.
            </p>
          </div>
        </div>
      )}

      {/* ── DEMO: Reminders ─────────────────────────────────── */}
      {isDemo && (
        <div className="bg-white border border-clinical-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-clinical-100">
            <p className="text-xs font-semibold text-clinical-700">Upcoming Reminders</p>
          </div>
          <div className="divide-y divide-clinical-50">
            {[
              { time: '48h before visit', msg: 'Your appointment is in 2 days. Please complete your intake form.' },
              { time: '24h before visit', msg: 'Reminder: Appointment tomorrow at 10:00 AM. Avoid eating 1 hour prior.' },
            ].map((r, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <IconClock className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-clinical-500 uppercase tracking-wide">{r.time}</p>
                  <p className="text-xs text-clinical-700 mt-0.5 leading-relaxed">{r.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Intake form status (shown when completed) ── */}
      {intakeCompleted && (
        <button
          onClick={onOpenIntake}
          className="w-full bg-white border border-primary-200 rounded-xl p-4 flex items-center gap-3 hover:bg-primary-50 transition-colors text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <IconFileText className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-clinical-800">Medical Intake Form</p>
            <p className="text-xs text-clinical-500 mt-0.5">View or update your intake responses</p>
            <div className="mt-1.5 h-1 bg-clinical-100 rounded-full overflow-hidden">
              <div className="h-full w-full bg-success-500 rounded-full" />
            </div>
            <p className="text-[10px] text-success-600 mt-1">
              Completed · {fmtDate(intakeData!.submittedAt)}
            </p>
          </div>
          <IconChevronRight className="w-4 h-4 text-clinical-300 group-hover:text-primary-500 transition-colors" />
        </button>
      )}

      {/* ── DEMO: Past appointments ──────────────────────────── */}
      {isDemo && (
        <div className="bg-white border border-clinical-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-clinical-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-clinical-700">Past Appointments</p>
            <button className="text-[10px] text-primary-600 font-medium">View all</button>
          </div>
          <div className="divide-y divide-clinical-50">
            {[
              { date: 'Sep 10, 2026', procedure: 'Prophylaxis' },
              { date: 'Jul 15, 2026', procedure: 'Root Canal Treatment #19' },
            ].map((a, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-success-50 flex items-center justify-center shrink-0">
                  <IconCheck className="w-3.5 h-3.5 text-success-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-clinical-800">{a.procedure}</p>
                  <p className="text-[10px] text-clinical-400">{a.date}</p>
                </div>
                <span className="text-[10px] font-medium text-success-600 bg-success-50 px-1.5 py-0.5 rounded">Done</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Book appointment CTA */}
      <button
        onClick={() => onNavigate('appointments')}
        className="w-full py-3.5 bg-primary-700 text-white font-semibold text-sm rounded-xl hover:bg-primary-800 transition-colors flex items-center justify-center gap-2"
      >
        <IconCalendar className="w-4 h-4" />
        {isDemo ? 'Book New Appointment' : 'Book Your First Appointment'}
      </button>
    </div>
  );
}
