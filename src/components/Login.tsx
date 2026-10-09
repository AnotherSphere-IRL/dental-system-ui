import { useState } from 'react';
import type { AuthUser, UserRole } from '../App';
import { IconTooth, IconLoader, IconAlert } from './icons';

interface Props {
  onLogin: (user: AuthUser) => void;
  onRegisterPatient: () => void;
  onRegisterStaff: () => void;
}

const DEMO_ACCOUNTS: Record<string, { name: string; role: UserRole; title?: string; password: string }> = {
  'dr.reyes@premierdental.ph': { name: 'Dr. Maria Reyes', role: 'clinic', title: 'Dentist · Admin', password: 'demo1234' },
  'staff@premierdental.ph': { name: 'Carlo Bautista', role: 'clinic', title: 'Clinic Staff', password: 'demo1234' },
  'ana.reyes@email.com': { name: 'Ana Kristina Reyes', role: 'patient', password: 'demo1234' },
};

type Tab = 'patient' | 'clinic';

export default function Login({ onLogin, onRegisterPatient, onRegisterStaff }: Props) {
  const [tab, setTab] = useState<Tab>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const account = DEMO_ACCOUNTS[email.toLowerCase()];

      if (!account) {
        setError('No account found with that email address.');
        setLoading(false);
        return;
      }
      if (account.password !== password) {
        setError('Incorrect password. Please try again.');
        setLoading(false);
        return;
      }
      if (tab === 'patient' && account.role !== 'patient') {
        setError('This account belongs to clinic staff. Please use the Staff / Doctor tab.');
        setLoading(false);
        return;
      }
      if (tab === 'clinic' && account.role !== 'clinic') {
        setError('This is a patient account. Please use the Patient tab.');
        setLoading(false);
        return;
      }

      onLogin({ name: account.name, email, role: account.role, title: account.title, isDemo: true });
    }, 900);
  };

  const fillDemo = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen flex bg-clinical-50">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-primary-900 p-10 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary-800 opacity-60" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-primary-800 opacity-40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary-700 opacity-20" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <IconTooth className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white leading-tight">Premier Dental Solutions</p>
              <p className="text-xs text-primary-300 leading-tight">Philippines</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold font-display leading-snug mt-16">
            Your smile is<br />our priority.
          </h2>
          <p className="text-primary-300 text-sm mt-3 leading-relaxed max-w-xs">
            A unified platform for patients and dental professionals — seamless care from booking to charting.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-3">
          {[
            { icon: '📅', text: 'Self-service online booking with real-time slots' },
            { icon: '🦷', text: 'Digital dental charting & patient records' },
            { icon: '💊', text: 'Rule-based medical alerts for clinical safety' },
            { icon: '📦', text: 'Automated inventory & purchase orders' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-primary-200">
              <span className="shrink-0">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-[11px] text-primary-500 mt-6">
          © 2026 Premier Dental Solutions PH · Secure · HIPAA-aligned
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
            <IconTooth className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-clinical-900">Premier Dental Solutions PH</p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-clinical-900 font-display">Welcome back</h1>
          <p className="text-sm text-clinical-500 mt-1">Sign in to your account to continue</p>

          {/* Role tabs */}
          <div className="flex gap-1 mt-6 bg-clinical-100 rounded-xl p-1">
            {(['patient', 'clinic'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setEmail(''); setPassword(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  tab === t
                    ? 'bg-white text-clinical-900 shadow-sm'
                    : 'text-clinical-500 hover:text-clinical-700'
                }`}
              >
                {t === 'patient' ? '🧑 Patient' : '🩺 Staff / Doctor'}
              </button>
            ))}
          </div>

          {/* Demo hint */}
          <div className="mt-4 p-3 bg-primary-50 border border-primary-100 rounded-xl">
            <p className="text-[11px] font-semibold text-primary-700 mb-1.5">Demo accounts — click to fill:</p>
            <div className="space-y-1">
              {tab === 'patient' ? (
                <button
                  onClick={() => fillDemo('ana.reyes@email.com', 'demo1234')}
                  className="block text-[11px] text-primary-600 hover:text-primary-900 hover:underline"
                >
                  👤 ana.reyes@email.com · demo1234
                </button>
              ) : (
                <>
                  <button
                    onClick={() => fillDemo('dr.reyes@premierdental.ph', 'demo1234')}
                    className="block text-[11px] text-primary-600 hover:text-primary-900 hover:underline"
                  >
                    🩺 dr.reyes@premierdental.ph · demo1234 (Doctor)
                  </button>
                  <button
                    onClick={() => fillDemo('staff@premierdental.ph', 'demo1234')}
                    className="block text-[11px] text-primary-600 hover:text-primary-900 hover:underline"
                  >
                    🏥 staff@premierdental.ph · demo1234 (Staff)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-clinical-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder={tab === 'patient' ? 'yourname@email.com' : 'youremail@premierdental.ph'}
                required
                className="w-full px-4 py-2.5 text-sm border border-clinical-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-clinical-300 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-clinical-700">Password</label>
                <button type="button" className="text-[11px] text-primary-600 hover:text-primary-800 font-medium">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-2.5 pr-10 text-sm border border-clinical-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-clinical-300 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-clinical-400 hover:text-clinical-600"
                >
                  {showPw ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-alert-50 border border-alert-100 rounded-xl text-xs text-alert-700">
                <IconAlert className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-700 text-white font-semibold text-sm rounded-xl hover:bg-primary-800 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? <><IconLoader className="w-4 h-4" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          {/* OAuth */}
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-clinical-200" />
              <span className="text-[11px] text-clinical-400 font-medium">or continue with</span>
              <div className="flex-1 h-px bg-clinical-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 px-4 border border-clinical-200 rounded-xl bg-white text-sm font-medium text-clinical-700 hover:bg-clinical-50 hover:border-clinical-300 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 px-4 border border-clinical-200 rounded-xl bg-white text-sm font-medium text-clinical-700 hover:bg-clinical-50 hover:border-clinical-300 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </button>
            </div>
            <p className="mt-2.5 text-[10px] text-clinical-400 text-center leading-relaxed">
              OAuth sign-in creates or accesses your account using your existing Google or Facebook credentials.
            </p>
          </div>

          {/* Register links */}
          <div className="mt-5 text-center">
            <p className="text-sm text-clinical-500">
              {tab === 'patient' ? (
                <>
                  New patient?{' '}
                  <button onClick={onRegisterPatient} className="font-semibold text-primary-700 hover:text-primary-900">
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  New staff member?{' '}
                  <button onClick={onRegisterStaff} className="font-semibold text-primary-700 hover:text-primary-900">
                    Request access
                  </button>
                </>
              )}
            </p>
          </div>

          {tab === 'clinic' && (
            <p className="mt-3 text-[11px] text-clinical-400 text-center">
              Staff accounts require admin approval. Contact Dr. Reyes for assistance.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
