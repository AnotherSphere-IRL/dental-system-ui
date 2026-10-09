import { useState } from 'react';
import { PAYMENT_METHODS, type PaymentMethod } from '../constants/paymentMethods';
import {
  IconHome, IconCalendar, IconFileText, IconReceipt, IconTooth,
} from './icons';
import PatientDashboard from './patient/PatientDashboard';
import Booking from './patient/Booking';
import MyAppointments from './patient/MyAppointments';
import HealthRecord from './patient/HealthRecord';
import IntakeForm, { DEMO_INTAKE_DATA } from './patient/IntakeForm';
import ServiceCatalog from './patient/ServiceCatalog';
import type { AuthUser, IntakeData } from '../App';
import { useClinic } from '../context/ClinicContext';

type PatientView = 'dashboard' | 'services' | 'appointments' | 'book-new' | 'health-record' | 'billing' | 'intake-form';

const PATIENT_NAV = [
  { id: 'dashboard' as PatientView, label: 'Home', Icon: IconHome },
  { id: 'services' as PatientView, label: 'Services', Icon: IconTooth },
  { id: 'appointments' as PatientView, label: 'Book', Icon: IconCalendar },
  { id: 'health-record' as PatientView, label: 'Records', Icon: IconFileText },
  { id: 'billing' as PatientView, label: 'Billing', Icon: IconReceipt },
];

interface Props { user: AuthUser; onLogout: () => void; }

export default function PatientApp({ user, onLogout }: Props) {
  const [view, setView] = useState<PatientView>('dashboard');
  const isDemo = user.isDemo ?? false;
  // Demo users start with pre-populated intake data; new users start with null
  const [intakeData, setIntakeData] = useState<IntakeData | null>(
    isDemo ? DEMO_INTAKE_DATA : null
  );
  // After completing intake, go back to this view (e.g. 'book-new' if initiated from booking)
  const [postIntakeView, setPostIntakeView] = useState<PatientView>('health-record');
  const [bookingServiceIds, setBookingServiceIds] = useState<string[]>([]);
  const intakeCompleted = intakeData !== null;
  const initials = user.name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('');

  const goToIntake = (returnTo: PatientView = 'health-record') => {
    setPostIntakeView(returnTo);
    setView('intake-form');
  };

  const handleIntakeSaved = (data: IntakeData) => {
    setIntakeData(data);
    setView(postIntakeView);
    setPostIntakeView('health-record');
  };

  return (
    <div className="h-full min-h-screen flex items-stretch justify-center bg-gradient-to-b from-primary-50 to-clinical-100">
      {/* Mobile container */}
      <div className="w-full max-w-md flex flex-col bg-white shadow-2xl relative">
        {/* Patient top header */}
        <div className="flex items-center justify-between px-4 py-3 bg-primary-700 text-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-500 rounded flex items-center justify-center">
              <IconTooth className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight">Premier Dental PH</p>
              <p className="text-[10px] text-primary-200 leading-tight">Patient Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs font-medium leading-tight">{user.name}</p>
              <p className="text-[10px] text-primary-300 leading-tight">
                {isDemo ? 'Demo Mode' : 'Patient Portal'}
              </p>
            </div>
            <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <button onClick={onLogout} title="Sign out" className="ml-1 text-primary-300 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {view === 'dashboard' && (
            <PatientDashboard
              user={user}
              isDemo={isDemo}
              intakeData={intakeData}
              onNavigate={setView}
              onOpenIntake={() => goToIntake('dashboard')}
            />
          )}
          {view === 'appointments' && (
            <MyAppointments
              isDemo={isDemo}
              onBookNew={() => setView('book-new')}
            />
          )}
          {view === 'services' && (
            <ServiceCatalog
              onBook={serviceIds => {
                setBookingServiceIds(serviceIds);
                setView('book-new');
              }}
            />
          )}
          {view === 'book-new' && (
            <Booking
              onBack={() => setView('appointments')}
              intakeCompleted={intakeCompleted}
              onOpenIntake={() => goToIntake('book-new')}
              initialServiceIds={bookingServiceIds}
            />
          )}
          {view === 'health-record' && (
            <HealthRecord
              isDemo={isDemo}
              intakeData={intakeData}
              onOpenIntake={() => goToIntake('health-record')}
            />
          )}
          {view === 'intake-form' && (
            <IntakeForm
              onBack={() => setView(postIntakeView)}
              onSaved={handleIntakeSaved}
              initialData={intakeData}
              isDemo={isDemo}
            />
          )}
          {view === 'billing' && <BillingPlaceholder user={user} isDemo={isDemo} />}
        </div>

        {/* Bottom nav */}
        <nav className="shrink-0 bg-white border-t border-clinical-200 flex">
          {PATIENT_NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors relative ${
                view === id ? 'text-primary-700' : 'text-clinical-400 hover:text-clinical-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${view === id ? 'text-primary-700' : 'text-clinical-400'}`} />
              {label}
              {id === 'dashboard' && !intakeCompleted && (
                <span className="absolute top-1.5 right-3 w-2 h-2 bg-alert-600 rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function BillingPlaceholder({ user, isDemo }: { user: AuthUser; isDemo: boolean }) {
  const { payments, refundRequests, createPaymentRequest } = useClinic();
  const [payStep, setPayStep] = useState<'due' | 'method' | 'status'>('due');
  const [method, setMethod] = useState<PaymentMethod>('GCash');
  const [requestRef, setRequestRef] = useState<string | null>(null);
  const transaction = requestRef ? payments.find(payment => payment.reference === requestRef) : null;
  const patientPayments = payments.filter(payment => payment.patientId === 'P-1042');

  const submitRequest = () => {
    const reference = createPaymentRequest({
      patient: user.name,
      patientId: 'P-1042',
      appointmentId: 'APT-0924-10',
      service: 'Composite Restoration (Tooth #14)',
      amountDue: 2500,
      method,
    });
    setRequestRef(reference);
    setPayStep('status');
  };

  if (!isDemo) {
    return (
      <div className="p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-clinical-900 font-display">Billing & Payments</h2>
          <p className="text-xs text-clinical-500 mt-0.5">Your current balance, payment requests, and history</p>
        </div>
        <div className="bg-clinical-50 border border-dashed border-clinical-200 rounded-xl p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-clinical-100 flex items-center justify-center mx-auto mb-3">
            <IconReceipt className="w-6 h-6 text-clinical-400" />
          </div>
          <p className="text-sm font-medium text-clinical-600">No billing records yet</p>
          <p className="text-xs text-clinical-400 mt-1">Your payment history and invoices will appear here after your first appointment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-clinical-900 font-display">Billing & Payments</h2>
        <p className="text-xs text-clinical-500 mt-0.5">Your current balance, payment requests, and history</p>
      </div>

      {payStep === 'due' && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-warning-500 animate-pulse" /><p className="text-xs font-semibold text-warning-700">Amount Due Today — Sep 24, 2026</p></div>
          <p className="text-3xl font-bold text-warning-700 tabular-nums mt-1">₱2,500.00</p>
          <p className="text-xs text-warning-600 mt-1">Composite Restoration (Tooth #14) · Appointment APT-0924-10</p>
          <p className="text-[10px] text-warning-500 mt-1">The service and current price were retrieved automatically from your appointment.</p>
          <button onClick={() => setPayStep('method')} className="mt-3 w-full py-2.5 bg-primary-700 text-white text-sm font-semibold rounded-xl hover:bg-primary-800">Review & Pay</button>
        </div>
      )}

      {payStep === 'method' && (
        <div className="bg-white border border-clinical-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between"><p className="text-sm font-semibold text-clinical-900">Select Payment Method</p><button onClick={() => setPayStep('due')} className="text-xs text-clinical-400">Back</button></div>
          <div className="bg-clinical-50 rounded-lg p-3"><p className="text-[10px] text-clinical-400">Appointment & Service</p><p className="text-xs font-medium text-clinical-800">APT-0924-10 · Composite Restoration (Tooth #14)</p><p className="text-sm font-bold text-clinical-900 mt-1">₱2,500.00</p></div>
          <div className="space-y-2">{PAYMENT_METHODS.map(item => <button key={item} onClick={() => setMethod(item)} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-medium ${method === item ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-clinical-200 text-clinical-700'}`}><span className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold">{item === 'GCash' ? 'GC' : item === 'Maya' ? 'M' : item === 'Bank Transfer' ? 'BT' : '₱'}</span>{item}</button>)}</div>
          <button onClick={submitRequest} className="w-full py-2.5 bg-primary-700 text-white text-sm font-semibold rounded-xl">Submit Payment Request</button>
        </div>
      )}

      {payStep === 'status' && transaction && (
        <div className={`border rounded-xl p-5 text-center space-y-2 ${transaction.status === 'paid' ? 'bg-success-50 border-success-200' : transaction.status === 'failed' ? 'bg-alert-50 border-alert-200' : 'bg-warning-50 border-warning-200'}`}>
          <p className="text-sm font-semibold text-clinical-900">{transaction.status === 'paid' ? 'Payment Successful' : transaction.status === 'processing' ? 'Payment Processing' : transaction.status === 'failed' ? 'Payment Failed' : 'Payment Request Pending'}</p>
          <StatusBadge status={transaction.status} />
          <p className="text-xs text-clinical-600">₱2,500.00 via {transaction.method} · {transaction.reference}</p>
          {transaction.method === 'Cash' && transaction.status === 'pending' && <p className="text-xs text-warning-700">Please prepare the exact amount and pay at the clinic desk. Your payment is not complete until staff confirms receipt.</p>}
          {transaction.status === 'processing' && <p className="text-xs text-primary-700">The payment provider is processing your request. This status updates automatically.</p>}
          {transaction.status === 'paid' && <p className="text-xs text-success-700">Your balance and receipt have been updated, and confirmation has been sent.</p>}
          <button onClick={() => setPayStep('due')} className="mt-2 text-xs font-semibold text-primary-700">Back to Billing</button>
        </div>
      )}

      <div className="bg-white border border-clinical-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-clinical-100"><p className="text-xs font-semibold text-clinical-700">Payment Requests & History</p></div>
        {patientPayments.map(payment => <div key={payment.reference} className="flex items-center px-4 py-3 border-b border-clinical-50 last:border-0"><div className="flex-1 min-w-0"><p className="text-xs font-medium text-clinical-800 truncate">{payment.service}</p><p className="text-[10px] text-clinical-400">{payment.createdAt} · {payment.method} · {payment.reference}</p></div><div className="text-right ml-2"><p className="text-sm font-semibold text-clinical-800">₱{payment.amountDue.toLocaleString()}</p><StatusBadge status={payment.status} /></div></div>)}
      </div>

      {refundRequests.filter(request => request.patientId === 'P-1042').length > 0 && (
        <div className="bg-white border border-clinical-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-clinical-100"><p className="text-xs font-semibold text-clinical-700">Refund Requests</p></div>
          {refundRequests.filter(request => request.patientId === 'P-1042').map(request => (
            <div key={request.id} className="flex items-center px-4 py-3 border-b border-clinical-50 last:border-0">
              <div className="flex-1"><p className="text-xs font-medium text-clinical-800">{request.service}</p><p className="text-[10px] text-clinical-400">{request.id} · Original {request.transactionRef}</p></div>
              <div className="text-right"><p className="text-sm font-semibold text-alert-700">−₱{request.requestedAmount.toLocaleString()}</p><StatusBadge status={request.status} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { pending: 'Pending', approved: 'Approved', awaiting_cash: 'Approved – Awaiting Cash Refund', processing: 'Processing', paid: 'Paid / Completed', refunded: 'Refunded / Completed', rejected: 'Rejected', failed: 'Failed', for_verification: 'For Verification' };
  const styles: Record<string, string> = { pending: 'bg-warning-50 text-warning-700', approved: 'bg-primary-50 text-primary-700', awaiting_cash: 'bg-warning-50 text-warning-700', processing: 'bg-primary-50 text-primary-700', paid: 'bg-success-50 text-success-700', refunded: 'bg-success-50 text-success-700', rejected: 'bg-alert-50 text-alert-700', failed: 'bg-alert-50 text-alert-700', for_verification: 'bg-warning-50 text-warning-700' };
  return <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded ${styles[status] ?? 'bg-clinical-100 text-clinical-600'}`}>{labels[status] ?? status}</span>;
}
