import { useState, useMemo } from 'react';
import DemoTriggers from './DemoTriggers';
import {
  IconAlert, IconCheck, IconClock, IconDollarSign,
  IconUsers, IconPackage, IconExternalLink, IconChevronRight,
  IconMail, IconTruck,
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

// ── Exception queue item shape ────────────────────────────────

type ExceptionSeverity = 'alert' | 'warning' | 'info';

interface ExceptionItem {
  id: string;
  severity: ExceptionSeverity;
  title: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
}

const SEVERITY_RANK: Record<ExceptionSeverity, number> = { alert: 3, warning: 2, info: 1 };

export default function Dashboard({ onNavigate, onOpenBilling, onViewPatient }: DashboardProps) {
  // Medical alerts are informational for the day; the doctor marks them as
  // reviewed (with a timestamp) rather than dismissing them entirely, so a
  // critical allergy never silently disappears mid-shift.
  const [reviewedAlerts, setReviewedAlerts] = useState<Record<string, string>>({});

  const {
    orders, inventory, getStockStatus, isExpiringSoon, isExpired,
    confirmReceived, suppliers, payments,
    refundRequests, cancellationRequests,
    orderDispatchLog, overstockReviewNotes, inventoryAlertLog,
    resolveOverstockNote,
  } = useClinic();

  // ── KPI aggregates ────────────────────────────────────────
  const lowStockCount = inventory.filter(i => ['critical', 'low'].includes(getStockStatus(i) as 'critical' | 'low')).length;
  const expiringCount = inventory.filter(i => i.batches.some(b => isExpiringSoon(b.expiry) || isExpired(b.expiry))).length;
  const openAlertCount = inventoryAlertLog.filter(a => !a.acknowledged).length;

  const collectedIncome = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amountPaid, 0);
  const incomeProgress = Math.min(Math.round((collectedIncome / 20000) * 100), 100);

  const overdueAccounts = payments.filter(p => p.status !== 'paid' && p.amountDue > p.amountPaid);
  const overdueTotal = overdueAccounts.reduce((sum, p) => sum + (p.amountDue - p.amountPaid), 0);

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name ?? id;

  // ── Exception queue ───────────────────────────────────────
  // Aggregates every "needs your action" item across orders, stock, and
  // supplier comms into a single prioritized list. This is the module's
  // core intent per the process doc — surface only exceptions.
  const exceptions = useMemo<ExceptionItem[]>(() => {
    const items: ExceptionItem[] = [];

    // 1. Unclear supplier replies — need classification.
    orders.filter(o => o.status === 'unclear').forEach(o => {
      items.push({
        id: `unclear-${o.id}`,
        severity: 'alert',
        title: `Unclear reply · ${getSupplierName(o.supplierId)}`,
        detail: `${o.poRef} · ${o.qty} ${o.unit} ${o.itemName}`,
        actionLabel: 'Classify →',
        onAction: () => onNavigate('orders'),
      });
    });

    // 2. Reroute chain exhausted — doctor must resolve manually.
    orders.filter(o => ['unavailable', 'no_response'].includes(o.status) && !o.linkedOrderId).forEach(o => {
      items.push({
        id: `escalation-${o.id}`,
        severity: 'alert',
        title: `Backup chain exhausted · ${getSupplierName(o.supplierId)}`,
        detail: `${o.poRef} · ${o.itemName}`,
        actionLabel: 'Handle →',
        onAction: () => onNavigate('orders'),
      });
    });

    // 3. Email bounces — supplier email needs verification.
    orderDispatchLog.filter(l => l.deliveryStatus === 'bounced').forEach(l => {
      items.push({
        id: `bounce-${l.id}`,
        severity: 'alert',
        title: `Email bounce · ${l.recipientName}`,
        detail: `${l.poRef} · ${l.recipientEmail}`,
        actionLabel: 'Fix email →',
        onAction: () => onNavigate('suppliers'),
      });
    });

    // 4. Reroute events — informational, but show the linked chain so the
    //    doctor can trace what happened without opening the Orders view.
    orders.filter(o => o.status === 'rerouted' && o.linkedOrderId).forEach(o => {
      const child = orders.find(c => c.id === o.linkedOrderId);
      items.push({
        id: `reroute-${o.id}`,
        severity: 'info',
        title: `Rerouted · ${getSupplierName(o.supplierId)}`,
        detail: `${o.poRef} → ${child ? getSupplierName(child.supplierId) : '—'}`,
        actionLabel: 'View chain →',
        onAction: () => onNavigate('orders'),
      });
    });

    // 5. Being delivered — one-click confirm receipt.
    orders.filter(o => o.status === 'being_delivered').forEach(o => {
      items.push({
        id: `delivered-${o.id}`,
        severity: 'info',
        title: `Being delivered · ${getSupplierName(o.supplierId)}`,
        detail: `${o.poRef} · ${o.qty} ${o.unit} ${o.itemName}`,
        actionLabel: 'Confirm Received',
        onAction: () => confirmReceived(o.id),
      });
    });

    // 6. Overstock review notes — need a doctor decision on threshold.
    overstockReviewNotes.filter(n => n.status === 'open').forEach(n => {
      items.push({
        id: `overstock-${n.id}`,
        severity: 'warning',
        title: `Overstock · ${n.itemName}`,
        detail: `${n.qty} at threshold ${n.overstockThreshold} · ordering suppressed`,
        actionLabel: 'Review →',
        onAction: () => onNavigate('inventory'),
      });
    });

    // 7. M18 §5 — Critical/Low stock alerts reach the dashboard. One entry
    // per unacknowledged alert; the linked order's dispatch state is folded
    // into the detail line so the doctor knows what the system already did.
    inventoryAlertLog
      .filter(a => !a.acknowledged && (a.severity === 'critical' || a.severity === 'low'))
      .forEach(a => {
        const order = a.linkedOrderId
          ? orders.find(o => o.id === a.linkedOrderId)
          : undefined;
        const orderHint = order
          ? order.status === 'queued'
            ? ' · order queued'
            : ' · PO sent'
          : '';
        items.push({
          id: `stock-${a.id}`,
          severity: a.severity === 'critical' ? 'alert' : 'warning',
          title: `${a.severity === 'critical' ? 'Critical' : 'Low'} stock · ${a.itemName}`,
          detail: `${a.qty} at threshold ${a.threshold}${orderHint}`,
          actionLabel: 'View →',
          onAction: () => onNavigate('inventory'),
        });
      });

    // 8. Expiring / expired batches — M19 §5. One entry per item so a single
    // supply with three expiring batches doesn't flood the queue. Expired
    // dominates when both states exist on the same item.
    inventory.forEach(item => {
      const expiredBatches = item.batches.filter(b => isExpired(b.expiry));
      const expiringBatches = item.batches.filter(b => isExpiringSoon(b.expiry));
      if (expiredBatches.length === 0 && expiringBatches.length === 0) return;

      const expiredCase = expiredBatches.length > 0;
      const relevant = expiredCase ? expiredBatches : expiringBatches;
      const totalQty = relevant.reduce((sum, b) => sum + b.qty, 0);
      const earliest = relevant.reduce(
        (min, b) => (new Date(b.expiry) < new Date(min) ? b.expiry : min),
        relevant[0].expiry,
      );
      const daysLeft = Math.ceil((new Date(earliest).getTime() - Date.now()) / 86400000);
      const batchWord = relevant.length === 1 ? 'batch' : 'batches';

      items.push({
        id: `expiry-${item.id}`,
        severity: expiredCase ? 'alert' : 'warning',
        title: `${expiredCase ? 'Expired' : 'Expiring'} · ${item.name}`,
        detail: expiredCase
          ? `${totalQty} ${item.unit} past expiry · ${relevant.length} ${batchWord}`
          : `${totalQty} ${item.unit} expire in ${daysLeft}d · ${relevant.length} ${batchWord}`,
        actionLabel: expiredCase ? 'Dispose →' : 'Review →',
        onAction: () => onNavigate('inventory'),
      });
    });

    // Highest severity first, then stable by insertion order.
    return items.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  }, [
    orders, orderDispatchLog, overstockReviewNotes, suppliers, confirmReceived, onNavigate,
    inventory, inventoryAlertLog, isExpired, isExpiringSoon,
  ]);

  // ── Compact status strip chips ────────────────────────────
  const compactChips = [
    {
      label: `Billing · ${payments.filter(p => p.status === 'pending').length} pay · ${refundRequests.filter(r => r.status === 'pending').length} refund`,
      onClick: () => onOpenBilling('payments'),
      tone: payments.filter(p => p.status === 'pending').length + refundRequests.filter(r => r.status === 'pending').length > 0 ? 'warning' as const : undefined,
    },
    {
      label: `Supply · ${lowStockCount} low · ${expiringCount} expiring`,
      onClick: () => onNavigate('inventory'),
      tone: lowStockCount > 0 ? 'warning' as const : undefined,
    },
    {
      label: `Stock alerts · ${openAlertCount} open`,
      onClick: () => onNavigate('inventory'),
      tone: openAlertCount > 0 ? 'warning' as const : undefined,
    },
    {
      label: `Rerouted · ${orders.filter(o => o.status === 'rerouted').length}`,
      onClick: () => onNavigate('orders'),
      tone: undefined,
    },
    {
      // M21 §3 Inputs — "Sent Orders / Order Notifications - Module 20".
      // Surface the count of POs currently awaiting supplier reply.
      label: `Orders · ${orders.filter(o => o.status === 'sent').length} awaiting response`,
      onClick: () => onNavigate('orders'),
      tone: undefined,
    },
    {
      label: `Overdue · ₱${overdueTotal.toLocaleString()} (${overdueAccounts.length})`,
      onClick: () => onOpenBilling('balances'),
      tone: overdueTotal > 0 ? 'alert' as const : undefined,
    },
  ];

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-clinical-900 font-display">Good morning, Dr. Reyes</h1>
          <p className="text-sm text-clinical-500 mt-0.5">
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => onNavigate('scheduling')}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
        >
          + Walk-in
        </button>
      </div>

      {/* KPI row — three tiles, everything else folds into the strip below */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          sub="Real-time · Target ₱20,000"
          icon={<IconDollarSign className="w-5 h-5 text-success-600" />}
          color="success"
          bar={{ value: incomeProgress }}
        />
        <StatCard
          label="Needs Your Action"
          value={String(exceptions.length)}
          sub={
            exceptions.length === 0
              ? 'All clear — nothing pending'
              : `${exceptions.filter(e => e.severity === 'alert').length} urgent · ${exceptions.filter(e => e.severity !== 'alert').length} review`
          }
          icon={<IconAlert className="w-5 h-5 text-alert-600" />}
          color="alert"
          urgent={exceptions.length > 0}
        />
      </div>

      {/* Exception Queue — the doc's "surface only exceptions as actionable items" */}
      <ExceptionQueue items={exceptions} />

      {/* Patient-facing context: schedule + medical alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white rounded-xl border border-clinical-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-clinical-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-clinical-800">Today's Schedule</h2>
            <button onClick={() => onNavigate('scheduling')} className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1">
              Full calendar <IconChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-clinical-50">
            {APPOINTMENTS.map((appt) => (
              <div key={appt.time} className="flex items-center gap-4 px-5 py-2.5 hover:bg-clinical-50 transition-colors">
                <div className="w-12 text-right shrink-0">
                  <span className="text-xs font-mono font-medium text-clinical-600">{appt.time}</span>
                </div>
                <div className={`w-1.5 h-8 rounded-full shrink-0 ${
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

        {/* Medical Alerts — non-dismissible during shift */}
        <div className="bg-white rounded-xl border border-alert-100 overflow-hidden">
          <div className="px-4 py-3 bg-alert-50 border-b border-alert-100 flex items-center gap-2">
            <IconAlert className="w-4 h-4 text-alert-600" />
            <h2 className="text-sm font-semibold text-alert-700">Medical Alerts</h2>
            {MEDICAL_ALERTS.length > 0 && (
              <span className="ml-auto bg-alert-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {MEDICAL_ALERTS.length}
              </span>
            )}
          </div>
          {MEDICAL_ALERTS.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <IconCheck className="w-8 h-8 text-success-600 mx-auto mb-2" />
              <p className="text-xs text-clinical-500">No active medical alerts for today</p>
            </div>
          ) : (
            <div className="divide-y divide-clinical-50 max-h-80 overflow-y-auto">
              {MEDICAL_ALERTS.map((alert) => {
                const reviewedAt = reviewedAlerts[alert.id];
                const isReviewed = Boolean(reviewedAt);
                return (
                  <div key={alert.id} className={`px-4 py-3 transition-colors ${isReviewed ? 'bg-clinical-50/50' : ''}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <span className={`text-xs font-semibold ${isReviewed ? 'text-clinical-500' : 'text-clinical-800'}`}>{alert.patient}</span>
                        <span className="text-[10px] text-clinical-400 ml-1.5">· {alert.time}</span>
                      </div>
                      {isReviewed ? (
                        <span className="shrink-0 text-[9px] font-semibold text-clinical-400 flex items-center gap-1">
                          <IconCheck className="w-3 h-3 text-success-600" /> Reviewed {reviewedAt}
                        </span>
                      ) : (
                        <button
                          onClick={() => setReviewedAlerts(prev => ({
                            ...prev,
                            [alert.id]: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
                          }))}
                          className="shrink-0 text-[10px] font-semibold text-clinical-500 hover:text-clinical-800 border border-clinical-200 rounded px-1.5 py-0.5 transition-colors"
                        >
                          Mark reviewed
                        </button>
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed mb-1.5 ${isReviewed ? 'text-clinical-500' : 'text-alert-700'}`}>{alert.message}</p>
                    <button
                      onClick={() => onViewPatient(alert.patientId, alert.patient, 'intake')}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary-600 hover:text-primary-800"
                    >
                      View Patient Intake Response <IconExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Compact status strip — every secondary metric as a linkable chip */}
      <CompactStatusStrip chips={compactChips} />

      {import.meta.env.DEV && <DemoTriggers />}
    </div>
  );
}

// ── Exception Queue ───────────────────────────────────────────

function ExceptionQueue({ items }: { items: ExceptionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-success-100 p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-success-50 flex items-center justify-center shrink-0">
            <IconCheck className="w-5 h-5 text-success-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-clinical-800">All clear</p>
            <p className="text-[11px] text-clinical-500">No orders, alerts, or reviews need your attention right now.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-clinical-100 bg-clinical-50 flex items-center gap-2">
        <IconAlert className="w-4 h-4 text-alert-600" />
        <p className="text-xs font-semibold text-clinical-800 uppercase tracking-wide">Needs your action</p>
        <span className="ml-auto text-[10px] font-bold bg-alert-600 text-white px-1.5 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>
      <div className="divide-y divide-clinical-50">
        {items.map(item => {
          const dotColor =
            item.severity === 'alert' ? 'bg-alert-500' :
            item.severity === 'warning' ? 'bg-warning-500' : 'bg-primary-500';
          const actionClass =
            item.severity === 'alert' ? 'bg-alert-600 text-white hover:bg-alert-700' :
            item.severity === 'warning' ? 'border border-warning-300 text-warning-700 hover:bg-warning-50' :
            'bg-primary-700 text-white hover:bg-primary-800';
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-clinical-800 truncate">{item.title}</p>
                <p className="text-[10px] text-clinical-500 truncate">{item.detail}</p>
              </div>
              <button
                onClick={item.onAction}
                className={`shrink-0 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${actionClass}`}
              >
                {item.actionLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Compact status strip ──────────────────────────────────────

function CompactStatusStrip({ chips }: {
  chips: { label: string; onClick: () => void; tone?: 'alert' | 'warning' }[];
}) {
  return (
    <div className="bg-white rounded-xl border border-clinical-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-clinical-400 px-1">At a glance</span>
      <span className="shrink-0 w-px h-4 bg-clinical-200" />
      {chips.map((chip, i) => {
        const toneClass =
          chip.tone === 'alert' ? 'bg-alert-50 text-alert-700 hover:bg-alert-100' :
          chip.tone === 'warning' ? 'bg-warning-50 text-warning-700 hover:bg-warning-100' :
          'bg-clinical-50 text-clinical-700 hover:bg-clinical-100';
        return (
          <button
            key={i}
            onClick={chip.onClick}
            className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${toneClass}`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────

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

// ── Appointment status badge ──────────────────────────────────

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
