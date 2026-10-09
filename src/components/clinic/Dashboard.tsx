import { useState, useMemo } from 'react';
import DemoTriggers from './DemoTriggers';
import {
  IconAlert, IconCheck, IconClock, IconDollarSign,
  IconUsers, IconPackage, IconExternalLink, IconX, IconChevronRight,
  IconMail, IconFileText, IconTruck,
} from '../icons';
import { useClinic, type SupplyOrder, type ResponseClass } from '../../context/ClinicContext';
import type { ProfileTab } from './PatientProfile';
import type { AdjustmentTab, BillingModule } from './Billing';

type View = 'dashboard' | 'calendar' | 'scheduling' | 'patients' | 'billing' | 'inventory' | 'orders' | 'suppliers' | 'reports' | 'settings';

interface DashboardProps {
  onNavigate: (v: View) => void;
  onOpenBilling: (module: BillingModule, adjustmentTab?: AdjustmentTab) => void;
  onViewPatient: (id: string, name: string, tab?: ProfileTab) => void;
}

const APPOINTMENTS = [
  { time: '09:00', patient: 'Maria Santos',     procedure: 'Prophylaxis',                 status: 'confirmed',   alert: true },
  { time: '09:30', patient: 'Roberto Lim',      procedure: 'Composite Filling #14',       status: 'confirmed',   alert: true },
  { time: '10:00', patient: 'Ana Reyes',        procedure: 'Dental Examination',           status: 'confirmed',   alert: false },
  { time: '11:00', patient: 'Jose dela Cruz',   procedure: 'Root Canal Treatment #19',    status: 'confirmed',   alert: false },
  { time: '13:00', patient: 'Carmen Aquino',    procedure: 'Crown Placement #3',          status: 'in-progress', alert: false },
  { time: '14:30', patient: 'Eduardo Bautista', procedure: 'Extraction #32',              status: 'pending',     alert: false },
  { time: '15:30', patient: 'Lilia Mendoza',    procedure: 'Orthodontic Consult',         status: 'pending',     alert: false },
];

const MEDICAL_ALERTS = [
  { id: 'a1', patientId: 'P-1042', patient: 'Ana Reyes', time: '10:00 AM', message: 'Patient reported medication allergy: Penicillin (anaphylactic reaction), Sulfa drugs.' },
  { id: 'a2', patientId: 'P-1042', patient: 'Ana Reyes', time: '10:00 AM', message: 'Patient reported history of type 2 diabetes. Currently on Metformin 500mg.' },
  { id: 'a3', patientId: 'P-1042', patient: 'Ana Reyes', time: '10:00 AM', message: 'Patient reported hypertension. Currently on Amlodipine 5mg daily.' },
];

export default function Dashboard({ onNavigate, onOpenBilling, onViewPatient }: DashboardProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const {
    orders, inventory, getStockStatus, isExpiringSoon, isExpired,
    confirmReceived, classifyResponse, suppliers, payments,
    refundRequests, cancellationRequests,
    orderDispatchLog, overstockReviewNotes, inventoryAlertLog,
    resolveOverstockNote,
  } = useClinic();

  const activeAlerts = MEDICAL_ALERTS.filter(a => !dismissedAlerts.includes(a.id));

  // ── Order panels ──────────────────────────────────────────
  const actionableOrders = orders.filter(o =>
    ['being_delivered', 'unclear', 'unavailable', 'no_response'].includes(o.status)
  );
  const rerouteEvents    = orders.filter(o => o.status === 'rerouted').slice(0, 5);
  const escalations      = orders.filter(o => ['unavailable', 'no_response'].includes(o.status) && !o.linkedOrderId);
  const activeOrderCount = orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length;

  // ── Supplier Response Status (M22) ────────────────────────
  const responseBreakdown = useMemo(() => ({
    confirmed:    orders.filter(o => ['being_delivered', 'completed'].includes(o.status)).length,
    unavailable:  orders.filter(o => o.status === 'unavailable').length,
    no_response:  orders.filter(o => o.status === 'no_response').length,
    unclear:      orders.filter(o => o.status === 'unclear').length,
  }), [orders]);

  // ── Bounce Alerts (M20 / M22) ─────────────────────────────
  const bounces = useMemo(
    () => orderDispatchLog.filter(l => l.deliveryStatus === 'bounced'),
    [orderDispatchLog],
  );

  // ── Overstock Notes (M18) ─────────────────────────────────
  const openOverstockNotes = useMemo(
    () => overstockReviewNotes.filter(n => n.status === 'open'),
    [overstockReviewNotes],
  );

  // ── Inventory status ──────────────────────────────────────
  const lowStockCount = inventory.filter(i => ['critical', 'low'].includes(getStockStatus(i) as 'critical' | 'low')).length;
  const expiringCount = inventory.filter(i => i.batches.some(b => isExpiringSoon(b.expiry) || isExpired(b.expiry))).length;

  // ── M18 open alerts ───────────────────────────────────────
  const openAlertCount = inventoryAlertLog.filter(a => !a.acknowledged).length;

  // ── M15 Overdue balances ──────────────────────────────────
  const overdueAccounts = payments.filter(p => p.status !== 'paid' && p.amountDue > p.amountPaid);
  const overdueCount = overdueAccounts.length;
  const overdueTotal = overdueAccounts.reduce((sum, p) => sum + (p.amountDue - p.amountPaid), 0);

  // ── M16 Income — fully live from payments ────────────────
  const collectedIncome = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amountPaid, 0);
  const incomeProgress = Math.min(Math.round((collectedIncome / 20000) * 100), 100);

  const incomeByService = useMemo(() => {
    const map = new Map<string, number>();
    payments
      .filter(p => p.status === 'paid')
      .forEach(p => map.set(p.service, (map.get(p.service) ?? 0) + p.amountPaid));
    return Array.from(map.entries())
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [payments]);

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name ?? id;

  const ORDER_STATUS_META: Record<string, { label: string; cls: string }> = {
    being_delivered: { label: 'Being Delivered', cls: 'bg-primary-100 text-primary-700 border-primary-200' },
    unclear:         { label: 'Unclear Response', cls: 'bg-warning-100 text-warning-700 border-warning-200' },
    unavailable:     { label: 'Unavailable', cls: 'bg-alert-100 text-alert-700 border-alert-200' },
    no_response:     { label: 'No Response', cls: 'bg-alert-100 text-alert-700 border-alert-200' },
    sent:            { label: 'Sent / Awaiting',  cls: 'bg-primary-50 text-primary-600 border-primary-100' },
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-clinical-900 font-display">Good morning, Dr. Reyes</h1>
          <p className="text-sm text-clinical-500 mt-0.5">
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => onNavigate('calendar')}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
        >
          + Walk-in
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Appointments"
          value="7"
          sub="3 completed · 4 upcoming"
          icon={<IconUsers className="w-5 h-5 text-primary-600" />}
          color="primary"
        />
        <StatCard
          label="Daily Income"
          value={`₱${collectedIncome.toLocaleString()}`}
          sub="Target: ₱20,000"
          icon={<IconDollarSign className="w-5 h-5 text-success-600" />}
          color="success"
          bar={{ value: incomeProgress }}
        />
        <StatCard
          label="Medical Alerts"
          value={String(activeAlerts.length)}
          sub="Requires clinical review"
          icon={<IconAlert className="w-5 h-5 text-alert-600" />}
          color="alert"
          urgent={activeAlerts.length > 0}
        />
        <StatCard
          label="Active Orders"
          value={String(activeOrderCount)}
          sub={`${actionableOrders.length} need action${lowStockCount > 0 ? ` · ${lowStockCount} low stock` : ''}`}
          icon={<IconPackage className="w-5 h-5 text-warning-600" />}
          color="warning"
          urgent={actionableOrders.length > 0}
        />
      </div>

      {/* Billing quick tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending Payments', count: payments.filter(p => p.status === 'pending').length, module: 'payments' as BillingModule, tab: undefined },
          { label: 'Pending Refunds', count: refundRequests.filter(r => r.status === 'pending').length, module: 'adjustments' as BillingModule, tab: 'refunds' as AdjustmentTab },
          { label: 'Pending Cancellations', count: cancellationRequests.filter(r => r.status === 'pending').length, module: 'adjustments' as BillingModule, tab: 'cancellations' as AdjustmentTab },
          { label: 'For Verification', count: payments.filter(p => p.status === 'for_verification').length, module: 'payments' as BillingModule, tab: undefined },
        ].map(item => (
          <button key={item.label} onClick={() => onOpenBilling(item.module, item.tab)}
            className="bg-white rounded-xl border border-clinical-200 p-3 text-left hover:border-primary-300 transition-colors">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-clinical-600">{item.label}</p>
              <IconChevronRight className="w-3.5 h-3.5 text-clinical-400" />
            </div>
            <p className="text-xl font-bold text-clinical-900 mt-1">{item.count}</p>
          </button>
        ))}
      </div>

      {/* M5 / M15 / M18 / M20 status tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-clinical-200 p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-warning-50 mb-3">
            <IconClock className="w-5 h-5 text-warning-600" />
          </div>
          <p className="text-2xl font-semibold text-clinical-900">3</p>
          <p className="text-xs text-clinical-500 mt-0.5">Pending Recalls</p>
          <p className="text-[10px] text-clinical-400 mt-1">2 overdue · 1 due this week</p>
        </div>
        <div className="bg-white rounded-xl border border-clinical-200 p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-alert-50 mb-3">
            <IconAlert className="w-5 h-5 text-alert-600" />
          </div>
          <p className="text-2xl font-semibold text-clinical-900">₱{overdueTotal.toLocaleString()}</p>
          <p className="text-xs text-clinical-500 mt-0.5">Overdue Balance</p>
          <p className="text-[10px] text-clinical-400 mt-1">{overdueCount} account{overdueCount !== 1 ? 's' : ''} past due</p>
        </div>
        <div className="bg-white rounded-xl border border-clinical-200 p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-warning-50 mb-3">
            <IconAlert className="w-5 h-5 text-warning-600" />
          </div>
          <p className="text-2xl font-semibold text-clinical-900">{openAlertCount}</p>
          <p className="text-xs text-clinical-500 mt-0.5">Open Stock Alerts</p>
          <p className="text-[10px] text-clinical-400 mt-1">{lowStockCount} low/critical · {openOverstockNotes.length} overstock</p>
        </div>
        <button
          onClick={() => onNavigate('orders')}
          className="bg-white rounded-xl border border-clinical-200 p-4 text-left hover:border-primary-300 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary-50 mb-3">
            <IconTruck className="w-5 h-5 text-primary-600" />
          </div>
          <p className="text-2xl font-semibold text-clinical-900">{orders.filter(o => o.status === 'queued').length}</p>
          <p className="text-xs text-clinical-500 mt-0.5">Queued Orders</p>
          <p className="text-[10px] text-clinical-400 mt-1">Awaiting EOD dispatch</p>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-clinical-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-clinical-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-clinical-800">Today's Schedule</h2>
            <button onClick={() => onNavigate('calendar')} className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1">
              Full calendar <IconChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-clinical-50">
            {APPOINTMENTS.map((appt) => (
              <div key={appt.time} className="flex items-center gap-4 px-5 py-3 hover:bg-clinical-50 transition-colors">
                <div className="w-12 text-right shrink-0">
                  <span className="text-xs font-mono font-medium text-clinical-600">{appt.time}</span>
                </div>
                <div className={`w-1.5 h-10 rounded-full shrink-0 ${
                  appt.status === 'in-progress' ? 'bg-primary-500' :
                  appt.status === 'confirmed'   ? 'bg-success-600' : 'bg-clinical-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-clinical-900 truncate">{appt.patient}</p>
                    {appt.alert && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-alert-50 text-alert-700 text-[10px] font-semibold rounded border border-alert-100">
                        <IconAlert className="w-2.5 h-2.5" /> ALERT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-clinical-500 truncate">{appt.procedure}</p>
                </div>
                <AppointmentBadge status={appt.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Medical Alerts */}
          <div className="bg-white rounded-xl border border-alert-100 overflow-hidden">
            <div className="px-4 py-3 bg-alert-50 border-b border-alert-100 flex items-center gap-2">
              <IconAlert className="w-4 h-4 text-alert-600" />
              <h2 className="text-sm font-semibold text-alert-700">Medical Alerts</h2>
              {activeAlerts.length > 0 && (
                <span className="ml-auto bg-alert-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {activeAlerts.length}
                </span>
              )}
            </div>
            {activeAlerts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <IconCheck className="w-8 h-8 text-success-600 mx-auto mb-2" />
                <p className="text-xs text-clinical-500">No active medical alerts for today</p>
              </div>
            ) : (
              <div className="divide-y divide-clinical-50 max-h-56 overflow-y-auto">
                {activeAlerts.map((alert) => (
                  <div key={alert.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <span className="text-xs font-semibold text-clinical-800">{alert.patient}</span>
                        <span className="text-[10px] text-clinical-400 ml-1.5">· {alert.time}</span>
                      </div>
                      <button onClick={() => setDismissedAlerts(p => [...p, alert.id])} className="text-clinical-300 hover:text-clinical-500 shrink-0">
                        <IconX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-alert-700 leading-relaxed mb-1.5">{alert.message}</p>
                    <button
                      onClick={() => onViewPatient(alert.patientId, alert.patient, 'intake')}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary-600 hover:text-primary-800"
                    >
                      View Patient Intake Response <IconExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order status and receiving */}
          <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-clinical-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconPackage className="w-4 h-4 text-primary-600" />
                <h2 className="text-sm font-semibold text-clinical-800">Order Status</h2>
              </div>
              <button onClick={() => onNavigate('orders')} className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1">
                All orders <IconChevronRight className="w-3 h-3" />
              </button>
            </div>
            {actionableOrders.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <IconCheck className="w-6 h-6 text-success-500 mx-auto mb-1" />
                <p className="text-xs text-clinical-500">No orders need action right now</p>
              </div>
            ) : (
              <div className="divide-y divide-clinical-50 max-h-60 overflow-y-auto">
                {actionableOrders.map(order => (
                  <OrderActionRow
                    key={order.id}
                    order={order}
                    statusMeta={ORDER_STATUS_META}
                    getSupplierName={getSupplierName}
                    onConfirm={confirmReceived}
                    onClassify={classifyResponse}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* M22 — Supplier Email Response Status + Bounce Alerts + Overstock Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Supplier Response Status */}
        <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-clinical-100 flex items-center gap-2">
            <IconMail className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-clinical-800">Supplier Response Status</h2>
          </div>
          <div className="grid grid-cols-2 gap-px bg-clinical-100">
            {[
              { label: 'Confirmed',    value: responseBreakdown.confirmed,   cls: 'text-success-700 bg-success-50' },
              { label: 'Unavailable',  value: responseBreakdown.unavailable, cls: 'text-alert-700 bg-alert-50' },
              { label: 'No Response',  value: responseBreakdown.no_response, cls: 'text-alert-700 bg-alert-50' },
              { label: 'Unclear',      value: responseBreakdown.unclear,     cls: 'text-warning-700 bg-warning-50' },
            ].map(cell => (
              <div key={cell.label} className={`px-3 py-3 ${cell.cls}`}>
                <p className="text-xl font-bold tabular-nums">{cell.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80 mt-0.5">{cell.label}</p>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-clinical-100 bg-clinical-50/60">
            <p className="text-[10px] text-clinical-400 leading-relaxed">
              Keyword-matched from supplier email replies. Ambiguous replies are routed to you for classification.
            </p>
          </div>
        </div>

        {/* Email Bounce Alerts */}
        <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-clinical-100 flex items-center gap-2">
            <IconAlert className="w-4 h-4 text-alert-600" />
            <h2 className="text-sm font-semibold text-clinical-800">Email Bounce Alerts</h2>
            {bounces.length > 0 && (
              <span className="ml-auto bg-alert-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {bounces.length}
              </span>
            )}
          </div>
          {bounces.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <IconCheck className="w-7 h-7 text-success-500 mx-auto mb-2" />
              <p className="text-xs text-clinical-500">No delivery failures</p>
              <p className="text-[10px] text-clinical-400 mt-1">All dispatches confirmed delivered.</p>
            </div>
          ) : (
            <div className="divide-y divide-clinical-50 max-h-56 overflow-y-auto">
              {bounces.map(log => (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-clinical-800 truncate">{log.recipientName}</p>
                      <p className="text-[10px] font-mono text-clinical-500 truncate">{log.recipientEmail}</p>
                    </div>
                    <span className="text-[9px] font-bold text-alert-700 bg-alert-50 border border-alert-100 px-1.5 py-0.5 rounded shrink-0">
                      BOUNCED
                    </span>
                  </div>
                  <p className="text-[10px] text-clinical-400 mt-1.5">
                    {log.poRef} · {log.dispatchedAt}
                  </p>
                  <p className="text-[10px] text-alert-600 mt-1 leading-relaxed">
                    SMTP delivery failed. Verify the supplier email in Module 23.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overstock Review Notes */}
        <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-clinical-100 flex items-center gap-2">
            <IconFileText className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-clinical-800">Overstock Review Notes</h2>
            {openOverstockNotes.length > 0 && (
              <span className="ml-auto bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {openOverstockNotes.length}
              </span>
            )}
          </div>
          {openOverstockNotes.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <IconCheck className="w-7 h-7 text-success-500 mx-auto mb-2" />
              <p className="text-xs text-clinical-500">No overstock alerts</p>
              <p className="text-[10px] text-clinical-400 mt-1">All items within healthy range.</p>
            </div>
          ) : (
            <div className="divide-y divide-clinical-50 max-h-56 overflow-y-auto">
              {openOverstockNotes.map(note => (
                <div key={note.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-xs font-semibold text-clinical-800 truncate">{note.itemName}</p>
                    <button
                      onClick={() => resolveOverstockNote(note.id)}
                      className="text-[10px] font-semibold text-primary-700 hover:text-primary-900 shrink-0"
                    >
                      Resolve
                    </button>
                  </div>
                  <p className="text-[10px] text-clinical-500 leading-relaxed">{note.reviewNote}</p>
                  <p className="text-[10px] text-clinical-400 mt-1.5">{note.createdAt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reroutes and escalations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reroute Events */}
        <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-clinical-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-clinical-800">Rerouted Orders</h2>
            <span className="text-[10px] text-clinical-400">{rerouteEvents.length} recent</span>
          </div>
          {rerouteEvents.length === 0 ? (
            <div className="px-5 py-6 text-center text-xs text-clinical-400">No reroutes yet — all orders fulfilled directly.</div>
          ) : (
            <div className="divide-y divide-clinical-50">
              {rerouteEvents.map(order => {
                const linked = orders.find(o => o.id === order.linkedOrderId);
                return (
                  <div key={order.id} className="px-5 py-3 flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-warning-400 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-clinical-900">{order.itemName}</p>
                      <p className="text-clinical-500 truncate">
                        {getSupplierName(order.supplierId)} → {linked ? getSupplierName(linked.supplierId) : '—'}
                      </p>
                      <p className="text-clinical-400">Reason: {order.responseClass === 'unavailable' ? 'Unavailable' : 'No Response'} · {order.updatedAt}</p>
                    </div>
                    {linked && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
                        linked.status === 'sent' ? 'bg-primary-50 text-primary-600 border-primary-100' :
                        linked.status === 'being_delivered' ? 'bg-primary-100 text-primary-700 border-primary-200' :
                        linked.status === 'completed' ? 'bg-success-50 text-success-700 border-success-100' :
                        'bg-clinical-100 text-clinical-600 border-clinical-200'
                      }`}>{linked.status.replace('_', ' ')}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Escalations */}
        <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-clinical-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-clinical-800">Order Escalations</h2>
            {escalations.length > 0 && (
              <span className="text-[10px] font-bold bg-alert-500 text-white px-1.5 py-0.5 rounded-full">{escalations.length}</span>
            )}
          </div>
          {escalations.length === 0 ? (
            <div className="px-5 py-6 text-center text-xs text-clinical-400">No escalations — backup chain handling all reroutes.</div>
          ) : (
            <div className="divide-y divide-clinical-50">
              {escalations.map(order => (
                <div key={order.id} className="px-5 py-3 flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-alert-500 mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-clinical-900">{order.itemName}</p>
                    <p className="text-clinical-500">{getSupplierName(order.supplierId)} · {order.responseClass}</p>
                    <p className="text-alert-600 font-medium mt-0.5">Backup chain exhausted — manual action required</p>
                  </div>
                  <button
                    onClick={() => onNavigate('orders')}
                    className="shrink-0 px-2 py-1 bg-alert-50 text-alert-700 text-[10px] font-semibold rounded border border-alert-100 hover:bg-alert-100 transition-colors"
                  >
                    Handle
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low stock summary strip */}
      {(lowStockCount > 0 || expiringCount > 0) && (
        <div className="bg-warning-50 border border-warning-100 rounded-xl px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs">
            <IconAlert className="w-4 h-4 text-warning-600 shrink-0" />
            <span className="text-warning-700">
              {lowStockCount > 0 && <><strong>{lowStockCount}</strong> item{lowStockCount > 1 ? 's' : ''} low/critical · </>}
              {expiringCount > 0 && <><strong>{expiringCount}</strong> item{expiringCount > 1 ? 's' : ''} expiring soon</>}
              {' '}— replenishment orders will be sent at end of day
            </span>
          </div>
          <button onClick={() => onNavigate('inventory')} className="shrink-0 text-xs font-semibold text-warning-700 hover:text-warning-900 flex items-center gap-1">
            View Inventory <IconChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Income summary — now fully computed from payments */}
      <div className="bg-white rounded-xl border border-clinical-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-clinical-800">Daily Income Breakdown</h2>
          <span className="text-[10px] text-clinical-400">Live from Payment Processing · Module 16</span>
        </div>
        {incomeByService.length === 0 ? (
          <div className="py-6 text-center">
            <IconDollarSign className="w-7 h-7 text-clinical-300 mx-auto mb-2" />
            <p className="text-xs text-clinical-500">No paid transactions today</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {incomeByService.map(item => (
              <div key={item.label} className="bg-clinical-50 rounded-lg p-3">
                <p className="text-[11px] text-clinical-500 mb-1 truncate" title={item.label}>{item.label}</p>
                <p className="text-base font-semibold text-clinical-900">₱{item.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-clinical-500">Collected today</span>
          <span className="font-semibold text-clinical-900">₱{collectedIncome.toLocaleString()}</span>
        </div>
        <div className="mt-2 h-2 bg-clinical-100 rounded-full overflow-hidden">
          <div className="h-full bg-success-600 rounded-full" style={{ width: `${incomeProgress}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-clinical-400">
          <span>{incomeProgress}% of daily target</span>
          <span>₱{Math.max(20000 - collectedIncome, 0).toLocaleString()} remaining</span>
        </div>
      </div>

      <DemoTriggers />
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, color, urgent, bar
}: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  color: 'primary' | 'success' | 'alert' | 'warning';
  urgent?: boolean; bar?: { value: number };
}) {
  const bgMap = { primary: 'bg-primary-50', success: 'bg-success-50', alert: 'bg-alert-50', warning: 'bg-warning-50' };
  return (
    <div className={`bg-white rounded-xl border p-4 ${urgent ? 'border-alert-200' : 'border-clinical-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bgMap[color]}`}>
          {icon}
        </div>
        {urgent && (
          <span className="text-[10px] font-bold text-alert-600 bg-alert-50 px-1.5 py-0.5 rounded border border-alert-100">
            URGENT
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-clinical-900">{value}</p>
      <p className="text-xs text-clinical-500 mt-0.5">{label}</p>
      <p className="text-[10px] text-clinical-400 mt-1">{sub}</p>
      {bar && (
        <div className="mt-2 h-1 bg-clinical-100 rounded-full overflow-hidden">
          <div className="h-full bg-success-600 rounded-full" style={{ width: `${bar.value}%` }} />
        </div>
      )}
    </div>
  );
}

function OrderActionRow({ order, statusMeta, getSupplierName, onConfirm, onClassify }: {
  order: SupplyOrder;
  statusMeta: Record<string, { label: string; cls: string }>;
  getSupplierName: (id: string) => string;
  onConfirm: (id: string) => void;
  onClassify: (id: string, cls: ResponseClass) => void;
}) {
  const [classifying, setClassifying] = useState(false);
  const meta = statusMeta[order.status];
  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-clinical-900 truncate">{order.itemName}</p>
          <p className="text-[10px] text-clinical-500">{getSupplierName(order.supplierId)} · {order.qty} {order.unit}</p>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${meta?.cls}`}>{meta?.label}</span>
      </div>
      {order.supplierResponse && (
        <p className="text-[10px] text-clinical-500 italic">"{order.supplierResponse}"</p>
      )}
      {order.status === 'being_delivered' && (
        <button
          onClick={() => onConfirm(order.id)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-success-600 text-white text-xs font-semibold rounded-lg hover:bg-success-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Confirm Received
        </button>
      )}
      {order.status === 'unclear' && !classifying && (
        <button onClick={() => setClassifying(true)} className="w-full px-3 py-1.5 bg-warning-500 text-white text-xs font-semibold rounded-lg hover:bg-warning-600 transition-colors">
          Classify Response
        </button>
      )}
      {order.status === 'unclear' && classifying && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-clinical-500 mr-1">Mark as:</span>
          <button onClick={() => { setClassifying(false); onClassify(order.id, 'confirmed'); }} className="px-2 py-1 bg-success-600 text-white text-[10px] font-bold rounded hover:bg-success-700">Confirmed</button>
          <button onClick={() => { setClassifying(false); onClassify(order.id, 'unavailable'); }} className="px-2 py-1 bg-alert-600 text-white text-[10px] font-bold rounded hover:bg-alert-700">Unavailable</button>
          <button onClick={() => setClassifying(false)} className="text-[10px] text-clinical-400 hover:text-clinical-600">Cancel</button>
        </div>
      )}
      {(order.status === 'unavailable' || order.status === 'no_response') && (
        <div className="flex items-center gap-2 p-2 bg-alert-50 rounded-lg border border-alert-100">
          <IconAlert className="w-3.5 h-3.5 text-alert-600 shrink-0" />
          <p className="text-[10px] text-alert-700 leading-relaxed">Backup chain exhausted — manual follow-up required.</p>
        </div>
      )}
    </div>
  );
}

function AppointmentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    'confirmed':   { label: 'Confirmed',   cls: 'bg-success-50 text-success-700 border-success-100' },
    'in-progress': { label: 'In Progress', cls: 'bg-primary-50 text-primary-700 border-primary-100' },
    'pending':     { label: 'Pending',     cls: 'bg-clinical-100 text-clinical-600 border-clinical-200' },
    'cancelled':   { label: 'Cancelled',   cls: 'bg-alert-50 text-alert-700 border-alert-100' },
  };
  const { label, cls } = map[status] ?? map['pending'];
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${cls}`}>{label}</span>;
}
