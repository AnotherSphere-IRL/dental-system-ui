import { useState } from 'react';
import type { AuthUser } from '../App';
import { IconTooth, IconLoader, IconAlert, IconCheck } from './icons';

interface Props {
  variant: 'patient' | 'staff';
  onSuccess: (user: AuthUser) => void;
  onBack: () => void;
}

type PatientStep = 'form' | 'otp' | 'done';
type StaffStep = 'form' | 'pending';

export default function Register({ variant, onSuccess, onBack }: Props) {
  return variant === 'patient'
    ? <PatientRegister onSuccess={onSuccess} onBack={onBack} />
    : <StaffRegister onSuccess={onSuccess} onBack={onBack} />;
}

/* ─── Patient Registration ─────────────────────────────────── */

function PatientRegister({ onSuccess, onBack }: Omit<Props, 'variant'>) {
  const [step, setStep] = useState<PatientStep>('form');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    dob: '', password: '', confirmPassword: '', agree: false,
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [k]: val }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required.';
    if (!form.lastName.trim()) e.lastName = 'Last name is required.';
    if (!form.email.includes('@')) e.email = 'Enter a valid email address.';
    if (!/^09\d{9}$/.test(form.phone.replace(/\s/g, '')))
      e.phone = 'Enter a valid PH mobile number (e.g. 09171234567).';
    if (!form.dob) e.dob = 'Date of birth is required.';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    if (!form.agree) e.agree = 'You must agree to the Terms and Privacy Policy.';
    return e;
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setStep('otp'); }, 900);
  };

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) {
      document.getElementById(`otp-${i + 1}`)?.focus();
    }
  };

  const handleVerifyOtp = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStep('done');
      setTimeout(() => {
        onSuccess({
          name: `${form.firstName} ${form.lastName}`,
          email: form.email,
          role: 'patient',
          isDemo: false,
        });
      }, 1500);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex bg-clinical-50">
      <BrandPanel />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-sm">
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-clinical-500 hover:text-clinical-800 mb-6 font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Sign In
          </button>

          {/* Step indicator */}
          <div className="flex gap-1 mb-6">
            {['Account Info', 'Verify Mobile', 'Done'].map((label, i) => {
              const stepIdx = step === 'form' ? 0 : step === 'otp' ? 1 : 2;
              return (
                <div key={i} className="flex-1 flex flex-col gap-1">
                  <div className={`h-1 rounded-full transition-all ${i <= stepIdx ? 'bg-primary-600' : 'bg-clinical-200'}`} />
                  <span className={`text-[10px] ${i <= stepIdx ? 'text-primary-600 font-medium' : 'text-clinical-400'}`}>{label}</span>
                </div>
              );
            })}
          </div>

          {step === 'form' && (
            <>
              <h1 className="text-2xl font-bold text-clinical-900 font-display">Create Patient Account</h1>
              <p className="text-sm text-clinical-500 mt-1">Register to book appointments and manage your records.</p>

              {/* OAuth quick-register */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 py-2.5 px-4 border border-clinical-200 rounded-xl bg-white text-xs font-medium text-clinical-700 hover:bg-clinical-50 hover:border-clinical-300 transition-all"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign up with Google
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 py-2.5 px-4 border border-clinical-200 rounded-xl bg-white text-xs font-medium text-clinical-700 hover:bg-clinical-50 hover:border-clinical-300 transition-all"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Sign up with Facebook
                </button>
              </div>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-clinical-200" />
                <span className="text-[11px] text-clinical-400 font-medium">or register with email</span>
                <div className="flex-1 h-px bg-clinical-200" />
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First Name" error={errors.firstName}>
                    <input value={form.firstName} onChange={set('firstName')} placeholder="Ana" className={input(errors.firstName)} />
                  </Field>
                  <Field label="Last Name" error={errors.lastName}>
                    <input value={form.lastName} onChange={set('lastName')} placeholder="Reyes" className={input(errors.lastName)} />
                  </Field>
                </div>

                <Field label="Email Address" error={errors.email}>
                  <input type="email" value={form.email} onChange={set('email')} placeholder="ana@email.com" className={input(errors.email)} />
                </Field>

                <Field label="Mobile Number (PH)" error={errors.phone} hint="Used for appointment reminders and OTP">
                  <input value={form.phone} onChange={set('phone')} placeholder="09171234567" maxLength={11} className={input(errors.phone)} />
                </Field>

                <Field label="Date of Birth" error={errors.dob}>
                  <input type="date" value={form.dob} onChange={set('dob')} className={input(errors.dob)} />
                </Field>

                <Field label="Password" error={errors.password} hint="Minimum 8 characters">
                  <input type="password" value={form.password} onChange={set('password')} placeholder="Create a password" className={input(errors.password)} />
                </Field>

                <Field label="Confirm Password" error={errors.confirmPassword}>
                  <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat your password" className={input(errors.confirmPassword)} />
                </Field>

                <div>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.agree} onChange={set('agree')} className="mt-0.5 w-4 h-4 accent-primary-700 shrink-0" />
                    <span className="text-xs text-clinical-600 leading-relaxed">
                      I agree to the{' '}
                      <span className="text-primary-700 font-medium">Terms of Service</span>
                      {' '}and{' '}
                      <span className="text-primary-700 font-medium">Privacy Policy</span>.
                      My health data will be stored securely.
                    </span>
                  </label>
                  {errors.agree && <p className="text-[11px] text-alert-600 mt-1">{errors.agree}</p>}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-primary-700 text-white font-semibold text-sm rounded-xl hover:bg-primary-800 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {submitting ? <><IconLoader className="w-4 h-4" /> Sending OTP...</> : 'Continue'}
                </button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <div>
              <h1 className="text-2xl font-bold text-clinical-900 font-display">Verify Your Mobile</h1>
              <p className="text-sm text-clinical-500 mt-1">
                We sent a 6-digit code to{' '}
                <span className="font-medium text-clinical-700">{form.phone}</span>
              </p>

              <div className="mt-8 flex gap-2 justify-center">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    className="w-11 h-14 text-center text-xl font-bold border-2 border-clinical-200 rounded-xl focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all bg-white"
                  />
                ))}
              </div>

              <div className="mt-3 text-center">
                <p className="text-[11px] text-clinical-400">
                  Didn't receive it?{' '}
                  <button className="text-primary-600 font-medium hover:underline">Resend OTP</button>
                </p>
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={submitting || otp.some(d => !d)}
                className="mt-6 w-full py-3 bg-primary-700 text-white font-semibold text-sm rounded-xl hover:bg-primary-800 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <><IconLoader className="w-4 h-4" /> Verifying...</> : 'Verify & Create Account'}
              </button>

              <p className="mt-3 text-center text-xs text-clinical-400">
                Demo: enter any 6 digits to proceed.
              </p>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-success-50 border-4 border-success-100 flex items-center justify-center mx-auto mb-4">
                <IconCheck className="w-8 h-8 text-success-600" />
              </div>
              <h2 className="text-xl font-bold text-clinical-900 font-display">Account Created!</h2>
              <p className="text-sm text-clinical-500 mt-2">
                Welcome, {form.firstName}. Signing you in...
              </p>
              <div className="mt-4 flex justify-center">
                <IconLoader className="w-5 h-5 text-primary-600" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Staff / Doctor Registration ──────────────────────────── */

function StaffRegister({ onSuccess, onBack }: Omit<Props, 'variant'>) {
  const [step, setStep] = useState<StaffStep>('form');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    role: 'doctor' as 'doctor' | 'staff',
    licenseNo: '', employeeId: '',
    password: '', confirmPassword: '', agree: false,
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = (e.target as HTMLInputElement).type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    setForm(p => ({ ...p, [k]: val }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required.';
    if (!form.lastName.trim()) e.lastName = 'Last name is required.';
    if (!form.email.includes('@')) e.email = 'Enter a valid email address.';
    if (!/^09\d{9}$/.test(form.phone.replace(/\s/g, '')))
      e.phone = 'Enter a valid PH mobile number.';
    if (form.role === 'doctor' && !form.licenseNo.trim())
      e.licenseNo = 'PRC License No. is required for doctors.';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    if (!form.agree) e.agree = 'You must agree to continue.';
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setStep('pending'); }, 1200);
  };

  return (
    <div className="min-h-screen flex bg-clinical-50">
      <BrandPanel />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-sm">
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-clinical-500 hover:text-clinical-800 mb-6 font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Sign In
          </button>

          {step === 'form' && (
            <>
              <h1 className="text-2xl font-bold text-clinical-900 font-display">Staff / Doctor Access</h1>
              <p className="text-sm text-clinical-500 mt-1">
                New accounts require admin approval before activation.
              </p>

              <div className="mt-4 p-3 bg-warning-50 border border-warning-100 rounded-xl text-xs text-warning-700 flex items-start gap-2">
                <IconAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Your request will be reviewed by Dr. Reyes. You'll be notified via email once approved.</span>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First Name" error={errors.firstName}>
                    <input value={form.firstName} onChange={set('firstName')} placeholder="Maria" className={input(errors.firstName)} />
                  </Field>
                  <Field label="Last Name" error={errors.lastName}>
                    <input value={form.lastName} onChange={set('lastName')} placeholder="Santos" className={input(errors.lastName)} />
                  </Field>
                </div>

                <Field label="Role">
                  <select
                    value={form.role}
                    onChange={set('role')}
                    className="w-full px-3 py-2.5 text-sm border border-clinical-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="doctor">Dentist / Doctor</option>
                    <option value="staff">Clinic Staff</option>
                  </select>
                </Field>

                <Field label="Work Email" error={errors.email}>
                  <input type="email" value={form.email} onChange={set('email')} placeholder="you@premierdental.ph" className={input(errors.email)} />
                </Field>

                <Field label="Mobile Number (PH)" error={errors.phone}>
                  <input value={form.phone} onChange={set('phone')} placeholder="09171234567" maxLength={11} className={input(errors.phone)} />
                </Field>

                {form.role === 'doctor' && (
                  <Field label="PRC License No." error={errors.licenseNo} hint="Required for all licensed dentists">
                    <input value={form.licenseNo} onChange={set('licenseNo')} placeholder="e.g. 0123456" className={input(errors.licenseNo)} />
                  </Field>
                )}

                <Field label="Employee / Staff ID" hint="Optional — assign after approval if unknown">
                  <input value={form.employeeId} onChange={set('employeeId')} placeholder="e.g. EMP-2026-001" className={input()} />
                </Field>

                <Field label="Password" error={errors.password} hint="Minimum 8 characters">
                  <input type="password" value={form.password} onChange={set('password')} placeholder="Create a password" className={input(errors.password)} />
                </Field>

                <Field label="Confirm Password" error={errors.confirmPassword}>
                  <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat password" className={input(errors.confirmPassword)} />
                </Field>

                <div>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.agree} onChange={set('agree')} className="mt-0.5 w-4 h-4 accent-primary-700 shrink-0" />
                    <span className="text-xs text-clinical-600 leading-relaxed">
                      I acknowledge that this account is for authorized clinic personnel only and that all patient data access is subject to RBAC and audit logging.
                    </span>
                  </label>
                  {errors.agree && <p className="text-[11px] text-alert-600 mt-1">{errors.agree}</p>}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-primary-700 text-white font-semibold text-sm rounded-xl hover:bg-primary-800 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {submitting
                    ? <><IconLoader className="w-4 h-4" /> Submitting Request...</>
                    : 'Submit Access Request'}
                </button>
              </form>
            </>
          )}

          {step === 'pending' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-primary-50 border-4 border-primary-100 flex items-center justify-center mx-auto mb-4">
                <IconCheck className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-clinical-900 font-display">Request Submitted</h2>
              <p className="text-sm text-clinical-500 mt-2 leading-relaxed">
                Your access request has been sent to Dr. Reyes for review. You'll receive an email at{' '}
                <span className="font-medium text-clinical-700">{form.email}</span> once approved.
              </p>

              <div className="mt-5 space-y-2 text-xs text-left bg-clinical-50 border border-clinical-200 rounded-xl p-4">
                <p className="font-semibold text-clinical-700 mb-2">What happens next:</p>
                {[
                  'Admin reviews your credentials and role',
                  'PRC license verified (for doctors)',
                  'Account activated and credentials emailed',
                  'First login requires password change',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-clinical-600">{step}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onBack}
                className="mt-6 w-full py-3 border border-clinical-200 bg-white text-clinical-700 font-semibold text-sm rounded-xl hover:bg-clinical-50 transition-all"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Shared helpers ────────────────────────────────────────── */

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-primary-900 p-10 text-white relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary-800 opacity-60" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-primary-800 opacity-40" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
            <IconTooth className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white leading-tight">Premier Dental Solutions</p>
            <p className="text-xs text-primary-300 leading-tight">Philippines</p>
          </div>
        </div>
        <h2 className="text-3xl font-bold font-display leading-snug mt-16">
          Secure.<br />Streamlined.<br />Patient-first.
        </h2>
        <p className="text-primary-300 text-sm mt-3 leading-relaxed max-w-xs">
          A role-based system ensuring the right people have the right access to the right information — always.
        </p>
      </div>
      <p className="relative z-10 text-[11px] text-primary-500">
        © 2026 Premier Dental Solutions PH · Secure · HIPAA-aligned
      </p>
    </div>
  );
}

function Field({
  label, error, hint, children
}: {
  label: string; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-clinical-700 mb-1.5">{label}</label>
      {children}
      {hint && !error && <p className="text-[11px] text-clinical-400 mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-alert-600 mt-1 flex items-center gap-1"><IconAlert className="w-3 h-3" />{error}</p>}
    </div>
  );
}

function input(error?: string) {
  return `w-full px-4 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-clinical-300 transition-all ${
    error
      ? 'border-alert-300 focus:ring-alert-400'
      : 'border-clinical-200 focus:ring-primary-500'
  }`;
}
