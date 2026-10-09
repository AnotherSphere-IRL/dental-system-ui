import { useState } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import ClinicApp from './components/ClinicApp';
import PatientApp from './components/PatientApp';

export type UserRole = 'patient' | 'clinic';

export interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  title?: string;
  isDemo?: boolean;
}

export interface MedicalAlert {
  questionId: string;
  rule: string;
  detail?: string;
  question: string;
}

export interface IntakeData {
  answers: Record<string, { answer: string; detail?: string }>;
  alerts: MedicalAlert[];
  submittedAt: string;
}

type AppView = 'login' | 'register-patient' | 'register-staff' | 'app';

export default function App() {
  const [view, setView] = useState<AppView>('login');
  const [user, setUser] = useState<AuthUser | null>(null);

  const handleLogin = (u: AuthUser) => {
    setUser(u);
    setView('app');
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  if (view === 'login') {
    return (
      <Login
        onLogin={handleLogin}
        onRegisterPatient={() => setView('register-patient')}
        onRegisterStaff={() => setView('register-staff')}
      />
    );
  }

  if (view === 'register-patient') {
    return (
      <Register
        variant="patient"
        onSuccess={(u) => handleLogin(u)}
        onBack={() => setView('login')}
      />
    );
  }

  if (view === 'register-staff') {
    return (
      <Register
        variant="staff"
        onSuccess={(u) => handleLogin(u)}
        onBack={() => setView('login')}
      />
    );
  }

  if (!user) return null;

  return user.role === 'clinic'
    ? <ClinicApp user={user} onLogout={handleLogout} />
    : <PatientApp user={user} onLogout={handleLogout} />;
}
