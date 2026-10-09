import { useState } from 'react';
import {
  IconDashboard, IconCalendar, IconUsers, IconReceipt,
  IconBarChart, IconSettings, IconTooth,
  IconBell, IconSearch, IconUser, IconChevronRight, IconClock, IconPackage,
} from './icons';
import Dashboard from './clinic/Dashboard';
import Charting from './clinic/Charting';
import Records from './clinic/Records';
import Billing, { type AdjustmentTab, type BillingModule } from './clinic/Billing';
import Scheduling from './clinic/Scheduling';
import Inventory from './clinic/Inventory';
import OrderMonitoring from './clinic/OrderMonitoring';
import Suppliers from './clinic/Suppliers';
import PatientProfile, { type ProfileTab } from './clinic/PatientProfile';
import type { AuthUser } from '../App';

type View = 'dashboard' | 'calendar' | 'scheduling' | 'patients' | 'billing' | 'inventory' | 'orders' | 'suppliers' | 'reports' | 'settings';

interface SelectedPatient {
  id: string;
  name: string;
  initialTab?: ProfileTab;
}

function IconBox({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

const NAV_ITEMS: { id: View; label: string; Icon: React.FC<{className?: string}> }[] = [
  { id: 'dashboard',  label: 'Dashboard',       Icon: IconDashboard },
  { id: 'scheduling', label: 'Scheduling',       Icon: IconClock },
  { id: 'calendar',   label: 'Charting',         Icon: IconCalendar },
  { id: 'patients',   label: 'Patients',         Icon: IconUsers },
  { id: 'billing',    label: 'Billing & Finance',Icon: IconReceipt },
  { id: 'inventory',  label: 'Inventory',        Icon: IconBox },
  { id: 'orders',     label: 'Orders',           Icon: IconPackage },
  { id: 'settings',   label: 'Settings',         Icon: IconSettings },
];

interface Props { user: AuthUser; onLogout: () => void; }

export default function ClinicApp({ user, onLogout }: Props) {
  const [view, setView] = useState<View>('dashboard');
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [billingModule, setBillingModule] = useState<BillingModule>('payments');
  const [billingAdjustmentTab, setBillingAdjustmentTab] = useState<AdjustmentTab>('refunds');
  const [inventoryEditTarget, setInventoryEditTarget] = useState<string | null>(null);
  // Deep-link target when Inventory → Orders navigation is triggered.
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const initials = user.name.split(' ')
    .filter(w => /^[A-Z]/.test(w) || w.startsWith('Dr'))
    .map(w => w.replace('Dr.', 'D').replace('.', '')[0])
    .slice(0, 2).join('');

  const handleViewPatient = (id: string, name: string, tab?: ProfileTab) => {
    setSelectedPatient({ id, name, initialTab: tab });
    setView('patients');
  };

  const handleNavChange = (v: View) => {
    setView(v);
    if (v !== 'patients') setSelectedPatient(null);
    // Clear any stale deep-link target when the user navigates elsewhere manually.
    if (v !== 'orders') setPendingOrderId(null);
  };

  const handleOpenBilling = (module: BillingModule, adjustmentTab?: AdjustmentTab) => {
    setBillingModule(module);
    if (adjustmentTab) setBillingAdjustmentTab(adjustmentTab);
    setView('billing');
    setSelectedPatient(null);
  };

  const handleNavigateToOrder = (orderId: string) => {
    setPendingOrderId(orderId);
    setView('orders');
    setSelectedPatient(null);
  };

  return (
    <div className="flex h-full min-h-screen overflow-hidden bg-clinical-50">
        {/* Sidebar */}
        <aside className={`flex flex-col bg-primary-900 text-white transition-all duration-200 shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
          {/* Logo */}
          <div className={`flex items-center gap-3 px-4 py-4 border-b border-primary-800 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shrink-0">
              <IconTooth className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <p className="text-[11px] font-semibold text-white leading-tight">Premier Dental</p>
                <p className="text-[10px] text-primary-300 leading-tight">Solutions PH</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(({ id, label, Icon }) => {
              const isActive = view === id;
              return (
                <button
                  key={id}
                  onClick={() => handleNavChange(id)}
                  title={collapsed ? label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    isActive ? 'bg-primary-700 text-white' : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                  {!collapsed && isActive && <IconChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                  {!isActive && id === 'dashboard' && !collapsed && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-alert-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Collapse + User */}
          <div className="border-t border-primary-800 p-2 space-y-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-primary-300 hover:text-white hover:bg-primary-800 transition-all text-xs"
            >
              <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {!collapsed && <span>Collapse</span>}
            </button>
            <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-xs font-semibold shrink-0">
                {initials || 'U'}
              </div>
              {!collapsed && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-medium text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-primary-400 truncate">{user.title ?? 'Clinic Staff'}</p>
                </div>
              )}
              {!collapsed && (
                <button onClick={onLogout} title="Sign out" className="text-primary-400 hover:text-white transition-colors shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="h-14 bg-white border-b border-clinical-200 flex items-center px-6 gap-4 shrink-0">
            <div className="flex-1">
              <div className="relative max-w-sm">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-clinical-400" />
                <input
                  type="text"
                  placeholder="Search patients, appointments..."
                  className="w-full pl-9 pr-4 py-1.5 text-sm bg-clinical-50 border border-clinical-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-clinical-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 text-clinical-500 hover:text-clinical-700 hover:bg-clinical-50 rounded-lg transition-colors">
                <IconBell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-alert-600 rounded-full" />
              </button>
              <div className="h-8 w-px bg-clinical-200" />
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                  {initials || <IconUser className="w-4 h-4" />}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-clinical-800">{user.name}</p>
                  <p className="text-[10px] text-clinical-500">{user.title ?? 'Clinic Staff'}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="min-h-full">
              {view === 'dashboard'  && <Dashboard onNavigate={handleNavChange} onOpenBilling={handleOpenBilling} onViewPatient={handleViewPatient} />}
              {view === 'patients'   && !selectedPatient && <Records onViewPatient={handleViewPatient} />}
              {view === 'patients'   && selectedPatient && (
                <PatientProfile
                  patientId={selectedPatient.id}
                  patientName={selectedPatient.name}
                  initialTab={selectedPatient.initialTab}
                  onBack={() => setSelectedPatient(null)}
                />
              )}
              {view === 'billing'    && <Billing initialModule={billingModule} initialAdjustmentTab={billingAdjustmentTab} />}
              {view === 'scheduling' && <Scheduling />}
              {view === 'calendar'   && <Charting />}
              {view === 'inventory'  && (
                <Inventory
                  initialEditItemName={inventoryEditTarget}
                  onNavigateToOrder={handleNavigateToOrder}
                />
              )}
              {view === 'orders'     && (
                <div className="mx-auto max-w-[1500px] p-6 lg:p-8">
                  <div className="mb-7">
                    <p className="font-display text-2xl font-semibold tracking-tight text-clinical-900">Order Monitoring</p>
                  </div>
                  <OrderMonitoring
                    initialOrderId={pendingOrderId}
                    onConsumeInitialOrderId={() => setPendingOrderId(null)}
                  />
                </div>
              )}
              {view === 'suppliers'  && <Suppliers />}
              {(view === 'reports' || view === 'settings') && (
                <PlaceholderView view={view} setView={handleNavChange} />
              )}
            </div>
          </main>
        </div>
    </div>
  );
}

function PlaceholderView({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-12">
      <div className="w-16 h-16 rounded-2xl bg-clinical-100 flex items-center justify-center mb-4">
        <IconBarChart className="w-8 h-8 text-clinical-400" />
      </div>
      <h3 className="text-lg font-semibold text-clinical-800 mb-1 capitalize">{view}</h3>
      <p className="text-sm text-clinical-500 max-w-xs">
        Navigate to Dashboard, Scheduling, Patients, Charting, Billing, Inventory, or Orders.
      </p>
      <button
        onClick={() => setView('dashboard')}
        className="mt-4 px-4 py-2 text-sm font-medium bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
