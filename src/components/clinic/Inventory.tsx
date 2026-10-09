import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  IconBell,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconExternalLink,
  IconPackage,
  IconPlus,
  IconPrinter,
  IconSearch,
  IconSettings,
  IconX,
} from '../icons';
import {
  useClinic,
  type InventoryItem,
  type InventoryBatch,
  type SupplyOrder,
  type InventoryAlertLog,
  type InventoryAuditAction,
  type OrderTimelineEvent,
} from '../../context/ClinicContext';

type StockState = 'critical' | 'low' | 'normal' | 'overstock';
type ExpiryState = 'expired' | 'expiring' | 'fresh' | 'none';
type Filter = 'expired' | 'all' | 'low' | 'expiring';
type PrimaryView = 'stock' | 'alerts';
type DetailTab = 'deductions' | 'activity';

export interface InventoryRow {
  id: string;
  name: string;
  category: string;
  quantity: number;
  max: number;
  unit: string;
  stock: StockState;
  expiry: ExpiryState;
  expiryTitle: string;
  expiryDetail: string;
  humanAction?: string;
  systemAction: string;
  systemKind: 'queued' | 'sent' | 'monitoring';
  sourceItem: InventoryItem;
  activeAlert?: InventoryAlertLog;
  linkedOrder?: SupplyOrder;
}

type DrawerState =
  | { kind: 'new' }
  | { kind: 'view'; item: InventoryRow }
  | { kind: 'edit'; item: InventoryRow };

const AUDIT_ACTION_LABELS: Record<InventoryAuditAction, string> = {
  'alert-fired': 'Alert fired',
  'alert-acknowledged': 'Alert acknowledged',
  'alert-auto-resolved': 'Alert auto-resolved',
  'overstock-note-resolved': 'Overstock note resolved',
  'item-created': 'Item created',
  'item-updated': 'Item updated',
  'item-deleted': 'Item deleted',
  'batch-discarded': 'Batch discarded',
};

interface ActivityEntry {
  id: string;
  ts: number;
  timestamp: string;
  actor: 'system' | 'doctor' | 'supplier';
  source: 'inventory' | 'order';
  action: string;
  detail: string;
}

// ── Adapter: context InventoryItem → display InventoryRow ─────

function buildInventoryRows(
  inventory: InventoryItem[],
  alertLog: InventoryAlertLog[],
  orders: SupplyOrder[],
  getStockStatus: (item: InventoryItem) => 'critical' | 'low' | 'ok' | 'overstock',
  isExpired: (e: string) => boolean,
  isExpiringSoon: (e: string) => boolean,
): InventoryRow[] {
  return inventory.map(item => {
    const rawStatus = getStockStatus(item);
    const stock: StockState = rawStatus === 'ok' ? 'normal' : rawStatus;

    let expiry: ExpiryState = 'none';
    let expiryTitle = 'Non-perishable';
    let expiryDetail = 'No batch tracking';
    const expiredBatches = item.batches.filter(b => isExpired(b.expiry));
    const expiringBatches = item.batches.filter(b => isExpiringSoon(b.expiry));
    if (item.batches.length === 0) {
      expiry = 'none';
    } else if (expiredBatches.length > 0) {
      expiry = 'expired';
      expiryTitle = `${expiredBatches.length} expired`;
      expiryDetail = expiredBatches.map(b => b.batchNo).join(', ');
    } else if (expiringBatches.length > 0) {
      expiry = 'expiring';
      expiryTitle = `${expiringBatches.length} expiring`;
      const soonest = expiringBatches.reduce((a, b) =>
        new Date(a.expiry) < new Date(b.expiry) ? a : b);
      const daysLeft = Math.ceil((new Date(soonest.expiry).getTime() - Date.now()) / 86400000);
      expiryDetail = `${daysLeft} days left · ${soonest.batchNo}`;
    } else {
      expiry = 'fresh';
      expiryTitle = 'All fresh';
      expiryDetail = item.batches.map(b => b.batchNo).join(', ');
    }

    const activeAlert = alertLog.find(a => a.itemId === item.id && !a.acknowledged);
    const linkedOrder = activeAlert?.linkedOrderId
      ? orders.find(o => o.id === activeAlert.linkedOrderId)
      : orders.find(o => o.itemId === item.id && !['completed', 'cancelled'].includes(o.status));

    let systemAction = 'Monitoring consumption';
    let systemKind: InventoryRow['systemKind'] = 'monitoring';
    if (activeAlert?.severity === 'overstock') {
      systemAction = 'Ordering suppressed · overstock review';
    } else if (linkedOrder) {
      switch (linkedOrder.status) {
        case 'queued':
          systemAction = 'Queued for EOD dispatch';
          systemKind = 'queued';
          break;
        case 'sent':
          systemAction = 'PO dispatched · awaiting response';
          systemKind = 'sent';
          break;
        case 'being_delivered':
          systemAction = 'Being delivered · confirm on arrival';
          systemKind = 'sent';
          break;
        case 'rerouted':
          systemAction = 'Rerouted to backup supplier';
          systemKind = 'sent';
          break;
        case 'unclear':
          systemAction = 'Unclear supplier response · classify';
          break;
        case 'unavailable':
        case 'no_response':
          systemAction = 'Escalated · chain exhausted';
          break;
        default:
          systemAction = `Order ${linkedOrder.status.replace('_', ' ')}`;
      }
    }

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      max: item.overstockThreshold,
      unit: item.unit,
      stock,
      expiry,
      expiryTitle,
      expiryDetail,
      humanAction: expiredBatches.length > 0 ? 'Awaiting physical disposal' : undefined,
      systemAction,
      systemKind,
      sourceItem: item,
      activeAlert,
      linkedOrder,
    };
  });
}

// ── Small icon helpers ────────────────────────────────────────

function IconTrash({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v5M14 11v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMore({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function IconInfinity({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M18.5 8.5c-3.5 0-5.4 7-9 7a3.5 3.5 0 1 1 0-7c3.6 0 5.5 7 9 7a3.5 3.5 0 1 0 0-7Z" strokeLinecap="round" />
    </svg>
  );
}

function IconTruck({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path d="M3 5h11v12H3zM14 9h4l3 4v4h-7z" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

function IconPencil({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m14 7 3 3" strokeLinecap="round" />
    </svg>
  );
}

function IconMail({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Display atoms ─────────────────────────────────────────────

function StatusBadge({ status }: { status: StockState }) {
  const styles: Record<StockState, string> = {
    critical: 'bg-alert-50 text-alert-700 border-alert-100',
    low: 'bg-warning-50 text-warning-700 border-warning-100',
    normal: 'bg-success-50 text-success-700 border-success-100',
    overstock: 'bg-blue-50 text-blue-700 border-blue-100',
  };
  const labels: Record<StockState, string> = {
    critical: 'Critical low',
    low: 'Low',
    normal: 'Normal',
    overstock: 'Overstock',
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function ExpiryCell({ item }: { item: InventoryRow }) {
  if (item.expiry === 'expired') {
    return (
      <div>
        <div className="flex items-center gap-1.5 font-semibold text-alert-700">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-alert-100 text-[10px]">!</span>
          {item.expiryTitle}
        </div>
        <p className="mt-1 text-xs text-alert-600">{item.expiryDetail}</p>
      </div>
    );
  }
  if (item.expiry === 'expiring') {
    return (
      <div>
        <div className="flex items-center gap-1.5 font-semibold text-warning-700">
          <IconClock className="h-4 w-4" />
          {item.expiryTitle}
        </div>
        <p className="mt-1 text-xs text-warning-700">{item.expiryDetail}</p>
      </div>
    );
  }
  if (item.expiry === 'none') {
    return (
      <div>
        <div className="flex items-center gap-1.5 font-medium text-clinical-700">
          <IconInfinity className="h-4 w-4" />
          {item.expiryTitle}
        </div>
        <p className="mt-1 text-xs text-clinical-400">{item.expiryDetail}</p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-1.5 font-semibold text-success-700">
        <IconCheck className="h-4 w-4" />
        {item.expiryTitle}
      </div>
      <p className="mt-1 text-xs text-clinical-400">{item.expiryDetail}</p>
    </div>
  );
}

function SystemAction({
  item,
  onManage,
  onAcknowledge,
  onViewOrder,
  onViewDeductions,
}: {
  item: InventoryRow;
  onManage: () => void;
  onAcknowledge: () => void;
  onViewOrder: (orderId: string) => void;
  onViewDeductions: () => void;
}) {
  const SystemIcon = item.systemKind === 'sent'
    ? IconTruck
    : item.systemKind === 'monitoring'
        ? IconPackage
        : IconClock;

  const primaryAction: { label: string; onClick: () => void } = (() => {
    if (item.activeAlert?.severity === 'overstock') {
      return { label: 'View deductions', onClick: onViewDeductions };
    }
    if (item.linkedOrder) {
      const order = item.linkedOrder;
      switch (order.status) {
        case 'queued':
        case 'sent':
          return { label: 'View order', onClick: () => onViewOrder(order.id) };
        case 'being_delivered':
          return { label: 'Confirm receipt', onClick: () => onViewOrder(order.id) };
        case 'rerouted':
          return { label: 'View order audit', onClick: () => onViewOrder(order.id) };
        case 'unclear':
          return { label: 'Classify response', onClick: () => onViewOrder(order.id) };
        case 'unavailable':
        case 'no_response':
          return { label: 'Handle escalation', onClick: () => onViewOrder(order.id) };
        default:
          return { label: 'View order', onClick: () => onViewOrder(order.id) };
      }
    }
    return { label: 'View deductions', onClick: onViewDeductions };
  })();

  const hasExpiryRisk = item.activeAlert?.expiryRisk
    && (item.activeAlert.expiryRisk.expiringQty > 0 || item.activeAlert.expiryRisk.expiredQty > 0);

  return (
    <div className="min-w-48 space-y-2 text-xs">
      <div className="flex items-center gap-2 text-clinical-600">
        <SystemIcon className="h-4 w-4 shrink-0" />
        <span>{item.systemAction}</span>
      </div>

      {hasExpiryRisk && item.activeAlert?.expiryRisk && (
        <p className="inline-flex items-center gap-1 rounded border border-warning-200 bg-warning-50 px-1.5 py-0.5 text-[10px] font-semibold text-warning-700">
          ⚠ {item.activeAlert.expiryRisk.expiredQty > 0
            ? `${item.activeAlert.expiryRisk.expiredQty} ${item.unit} already expired`
            : `${item.activeAlert.expiryRisk.expiringQty} ${item.unit} expire in ${item.activeAlert.expiryRisk.earliestExpiryDays}d`}
        </p>
      )}

      <button
        onClick={primaryAction.onClick}
        className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:text-primary-900"
      >
        {primaryAction.label} <IconChevronRight className="h-3 w-3" />
      </button>

      {item.humanAction && (
        <div className="flex items-start gap-2 text-alert-700">
          <IconTrash className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{item.humanAction}</p>
            <button onClick={onManage} className="mt-1 inline-flex items-center gap-1 font-semibold text-primary-700 hover:text-primary-900">
              Manage batches <IconExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {item.activeAlert && (
        <button
          onClick={onAcknowledge}
          className="inline-flex items-center gap-1 rounded-md border border-warning-200 bg-warning-50 px-2 py-0.5 text-[10px] font-semibold text-warning-700 hover:bg-warning-100 transition"
        >
          <IconBell className="h-3 w-3" />
          Acknowledge {item.activeAlert.severity} alert
        </button>
      )}
    </div>
  );
}

// ── Alerts view ───────────────────────────────────────────────

type AlertTone = 'alert' | 'warning' | 'info';

const ALERT_TONE_STYLES: Record<AlertTone, { bar: string; title: string; badge: string }> = {
  alert:   { bar: 'border-alert-500',   title: 'text-alert-700',   badge: 'bg-alert-100 text-alert-800' },
  warning: { bar: 'border-warning-500', title: 'text-warning-700', badge: 'bg-warning-100 text-warning-800' },
  info:    { bar: 'border-blue-500',    title: 'text-blue-700',    badge: 'bg-blue-100 text-blue-800' },
};

function AlertSummaryTile({ label, count, tone, sub }: { label: string; count: number; tone: AlertTone; sub: string }) {
  const s = ALERT_TONE_STYLES[tone];
  return (
    <div className="rounded-xl border border-clinical-200 bg-white p-4">
      <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-bold ${s.badge}`}>
        {count}
      </span>
      <p className="mt-3 text-xs font-semibold text-clinical-700">{label}</p>
      <p className="mt-0.5 text-[10px] text-clinical-400">{sub}</p>
    </div>
  );
}

interface AlertsViewProps {
  rows: InventoryRow[];
  onAcknowledge: (alertId: string) => void;
  onViewOrder: (orderId: string) => void;
  onViewItem: (row: InventoryRow) => void;
  onManageBatches: (row: InventoryRow) => void;
}

function AlertsView({ rows, onAcknowledge, onViewOrder, onViewItem, onManageBatches }: AlertsViewProps) {
  const categoryByItem = new Map<string, 'critical' | 'low' | 'overstock' | 'expiry'>();
  rows.forEach(row => {
    if (row.stock === 'critical') categoryByItem.set(row.id, 'critical');
    else if (row.stock === 'low') categoryByItem.set(row.id, 'low');
    else if (row.stock === 'overstock') categoryByItem.set(row.id, 'overstock');
    else if (row.expiry === 'expired' || row.expiry === 'expiring') categoryByItem.set(row.id, 'expiry');
  });

  const critical = rows.filter(r => categoryByItem.get(r.id) === 'critical');
  const low = rows.filter(r => categoryByItem.get(r.id) === 'low');
  const overstock = rows.filter(r => categoryByItem.get(r.id) === 'overstock');
  const expiry = rows.filter(r => categoryByItem.get(r.id) === 'expiry');

  const total = critical.length + low.length + overstock.length + expiry.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-clinical-200 bg-white px-6 py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-50">
          <IconCheck className="h-6 w-6 text-success-600" />
        </div>
        <p className="mt-3 text-sm font-semibold text-clinical-800">All clear — no active alerts</p>
        <p className="mt-1 text-xs text-clinical-400">
          All items are within healthy thresholds and no batches are expiring soon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AlertSummaryTile label="Critical Low" count={critical.length} tone="alert" sub="Auto-drafted for dispatch" />
        <AlertSummaryTile label="Low / Reorder" count={low.length} tone="warning" sub="Queued for end-of-day" />
        <AlertSummaryTile label="Overstock" count={overstock.length} tone="info" sub="Ordering suppressed" />
        <AlertSummaryTile label="Expiring / Expired" count={expiry.length} tone="warning" sub="Review batches" />
      </div>

      {critical.length > 0 && (
        <AlertGroup title="Critical Low" tone="alert"
          description="Quantity at or below the critical threshold. Auto-drafted for immediate dispatch."
          rows={critical} onAcknowledge={onAcknowledge} onViewOrder={onViewOrder} onViewItem={onViewItem} onManageBatches={onManageBatches} />
      )}
      {low.length > 0 && (
        <AlertGroup title="Low / Reorder" tone="warning"
          description="Quantity at or below the reorder threshold. Queued for end-of-day dispatch."
          rows={low} onAcknowledge={onAcknowledge} onViewOrder={onViewOrder} onViewItem={onViewItem} onManageBatches={onManageBatches} />
      )}
      {overstock.length > 0 && (
        <AlertGroup title="Overstock" tone="info"
          description="Quantity above the maximum. Ordering is suppressed — review consumption or adjust the threshold."
          rows={overstock} onAcknowledge={onAcknowledge} onViewOrder={onViewOrder} onViewItem={onViewItem} onManageBatches={onManageBatches} />
      )}
      {expiry.length > 0 && (
        <AlertGroup title="Expiring / Expired" tone="warning"
          description="Batches approaching or past their expiration date. Review for use or physical disposal."
          rows={expiry} onAcknowledge={onAcknowledge} onViewOrder={onViewOrder} onViewItem={onViewItem} onManageBatches={onManageBatches} />
      )}
    </div>
  );
}

interface AlertGroupProps extends Omit<AlertsViewProps, 'rows'> {
  title: string;
  tone: AlertTone;
  description: string;
  rows: InventoryRow[];
}

function AlertGroup({ title, tone, description, rows, onAcknowledge, onViewOrder, onViewItem, onManageBatches }: AlertGroupProps) {
  const s = ALERT_TONE_STYLES[tone];
  return (
    <section>
      <div className={`flex items-center gap-2 border-l-2 ${s.bar} pl-3`}>
        <p className={`text-xs font-bold uppercase tracking-wider ${s.title}`}>{title}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.badge}`}>{rows.length}</span>
      </div>
      <p className="mb-3 mt-1.5 pl-4 text-[11px] text-clinical-500">{description}</p>
      <div className="space-y-2">
        {rows.map(row => (
          <AlertRowCard key={row.id} row={row}
            onAcknowledge={onAcknowledge} onViewOrder={onViewOrder} onViewItem={onViewItem} onManageBatches={onManageBatches} />
        ))}
      </div>
    </section>
  );
}

function AlertRowCard({ row, onAcknowledge, onViewOrder, onViewItem, onManageBatches }: { row: InventoryRow } & Omit<AlertsViewProps, 'rows'>) {
  const primary = (() => {
    if (row.expiry === 'expired' || row.expiry === 'expiring') {
      return { label: 'Review batches', onClick: () => onManageBatches(row) };
    }
    if (row.activeAlert?.severity === 'overstock') {
      return { label: 'View deductions', onClick: () => onViewItem(row) };
    }
    if (row.linkedOrder) {
      const orderId = row.linkedOrder.id;
      switch (row.linkedOrder.status) {
        case 'being_delivered':
          return { label: 'Confirm receipt', onClick: () => onViewOrder(orderId) };
        case 'unclear':
          return { label: 'Classify response', onClick: () => onViewOrder(orderId) };
        case 'unavailable':
        case 'no_response':
          return { label: 'Handle escalation', onClick: () => onViewOrder(orderId) };
        default:
          return { label: 'View order', onClick: () => onViewOrder(orderId) };
      }
    }
    return { label: 'View item', onClick: () => onViewItem(row) };
  })();

  const thresholdLabel = row.activeAlert
    ? row.activeAlert.severity === 'critical' ? 'Critical'
      : row.activeAlert.severity === 'low' ? 'Reorder'
      : 'Overstock'
    : null;

  const expiryRisk = row.activeAlert?.expiryRisk;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-clinical-200 bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-clinical-900">{row.name}</p>
          <StatusBadge status={row.stock} />
        </div>
        <p className="mt-1 text-[11px] text-clinical-400">{row.category} · {row.id}</p>
        <p className="mt-1.5 truncate text-xs text-clinical-600">{row.systemAction}</p>
        {row.activeAlert && thresholdLabel && (
          <p className="mt-0.5 text-[10px] text-clinical-400">
            {thresholdLabel} threshold:{' '}
            <span className="font-semibold text-clinical-600">{row.activeAlert.threshold} {row.unit}</span>
          </p>
        )}
        {expiryRisk && (expiryRisk.expiringQty > 0 || expiryRisk.expiredQty > 0) && (
          <p className="mt-1 inline-flex items-center gap-1 rounded border border-warning-200 bg-warning-50 px-1.5 py-0.5 text-[10px] font-semibold text-warning-700">
            ⚠ {expiryRisk.expiredQty > 0
              ? `${expiryRisk.expiredQty} ${row.unit} already expired`
              : `${expiryRisk.expiringQty} ${row.unit} expire in ${expiryRisk.earliestExpiryDays}d`}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-lg font-bold leading-none text-clinical-900">
          {row.quantity}
          <span className="ml-1 text-xs font-normal text-clinical-400">/ {row.max}</span>
        </p>
        <p className="mt-1 text-[10px] text-clinical-400">{row.unit}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <button onClick={primary.onClick} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900">
          {primary.label} <IconChevronRight className="h-3 w-3" />
        </button>
        {row.activeAlert && (
          <button
            onClick={() => onAcknowledge(row.activeAlert!.id)}
            className="inline-flex items-center gap-1 rounded-md border border-warning-200 bg-warning-50 px-2 py-0.5 text-[10px] font-semibold text-warning-700 hover:bg-warning-100 transition"
          >
            <IconBell className="h-3 w-3" />
            Acknowledge
          </button>
        )}
      </div>
    </div>
  );
}

// ── Drawer primitives ────────────────────────────────────────

function DrawerShell({ children, onClose, width = 'max-w-xl' }: { children: ReactNode; onClose: () => void; width?: string }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close drawer" onClick={onClose} className="absolute inset-0 bg-clinical-900/30" />
      <section className={`relative flex h-full w-full ${width} flex-col bg-white shadow-2xl`}>
        {children}
      </section>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-clinical-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-clinical-400">{hint}</span>}
    </label>
  );
}

const inputClass = 'w-full rounded-lg border border-clinical-200 bg-white px-3 py-2.5 text-sm text-clinical-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

// ── ItemDetails (read-only view with tabbed logs) ─────────────

function ItemDetails({ item, initialTab = 'deductions' }: { item: InventoryRow; initialTab?: DetailTab }) {
  const { deductionLog, suppliers, inventoryAuditLog, orderTimeline, orders } = useClinic();
  const [historyRange, setHistoryRange] = useState<7 | 30 | 90>(30);
  const [procedureFilter, setProcedureFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);

  const usageEntries = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - historyRange);
    return deductionLog
      .filter(entry => entry.itemId === item.id && new Date(entry.date) >= cutoff)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [deductionLog, historyRange, item.id]);

  const procedureBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    usageEntries.forEach(entry => {
      map.set(entry.procedure, (map.get(entry.procedure) ?? 0) + entry.qty);
    });
    return Array.from(map.entries())
      .map(([procedure, qty]) => ({ procedure, qty }))
      .sort((a, b) => b.qty - a.qty);
  }, [usageEntries]);

  const filteredEntries = procedureFilter === 'all'
    ? usageEntries
    : usageEntries.filter(entry => entry.procedure === procedureFilter);

  const totalUsed = usageEntries.reduce((total, entry) => total + entry.qty, 0);

  // ── Activity entries — merge inventory audit + order timeline ──
  const activityEntries = useMemo<ActivityEntry[]>(() => {
    const invEntries: ActivityEntry[] = inventoryAuditLog
      .filter(e => e.itemId === item.id)
      .map(e => ({
        id: e.id,
        ts: e.ts,
        timestamp: e.timestamp,
        actor: e.actor,
        source: 'inventory',
        action: AUDIT_ACTION_LABELS[e.action],
        detail: e.detail,
      }));

    const itemOrderIds = new Set(orders.filter(o => o.itemId === item.id).map(o => o.id));
    const ordEntries: ActivityEntry[] = orderTimeline
      .filter(e => itemOrderIds.has(e.orderId))
      .map(e => ({
        id: e.id,
        ts: e.ts,
        timestamp: e.timestamp,
        actor: e.actor,
        source: 'order',
        action: e.title,
        detail: e.detail,
      }));

    return [...invEntries, ...ordEntries].sort((a, b) => b.ts - a.ts);
  }, [inventoryAuditLog, orderTimeline, orders, item.id]);

  const primarySupplier = suppliers.find(s => s.id === item.sourceItem.supplierId);
  const backupSuppliers = item.sourceItem.backupSupplierIds
    .map(id => suppliers.find(s => s.id === id)?.name)
    .filter(Boolean);

  const thresholds = [
    { label: 'Critical Low', value: item.sourceItem.criticalThreshold, tone: 'text-alert-700' },
    { label: 'Low / Reorder', value: item.sourceItem.reorderThreshold, tone: 'text-warning-700' },
    { label: 'Overstock / Max', value: item.sourceItem.overstockThreshold, tone: 'text-blue-700' },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      {/* Section 1 — Live stock + thresholds */}
      <section className="border-b border-clinical-200 pb-7">
        <p className="mb-5 font-semibold text-clinical-900">Stock &amp; thresholds</p>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-clinical-400">Usable quantity</p>
            <p className="mt-1 text-3xl font-bold leading-none text-clinical-900">
              {item.quantity}
              <span className="ml-2 text-base font-normal text-clinical-400">{item.unit}</span>
            </p>
          </div>
          <StatusBadge status={item.stock} />
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-3">
          {thresholds.map(metric => (
            <div key={metric.label} className="rounded-xl bg-clinical-50 p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-clinical-400">{metric.label}</dt>
              <dd className={`mt-1 text-lg font-bold ${metric.tone}`}>{metric.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Section 2 — Supplier routing */}
      <section className="border-b border-clinical-200 py-7">
        <p className="mb-4 font-semibold text-clinical-900">Supplier routing</p>
        <dl className="grid grid-cols-1 gap-3 text-sm">
          <div className="rounded-xl border border-clinical-100 bg-clinical-50/60 p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-clinical-400">Primary supplier</dt>
            <dd className="mt-1 font-medium text-clinical-800">
              {primarySupplier?.name ?? item.sourceItem.supplierId}
            </dd>
            {primarySupplier?.email && (
              <dd className="mt-0.5 text-[11px] text-clinical-500">{primarySupplier.email}</dd>
            )}
          </div>
          <div className="rounded-xl border border-clinical-100 bg-clinical-50/60 p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-clinical-400">Backup chain (in order)</dt>
            <dd className="mt-1 font-medium text-clinical-800">
              {backupSuppliers.length > 0
                ? backupSuppliers.map((name, i) => `${i + 1}. ${name}`).join('  →  ')
                : 'None configured'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Section 3 — Tabbed logs */}
      <section className="pt-7">
        <div className="mb-5 flex gap-0.5 border-b border-clinical-200">
          <button
            type="button"
            onClick={() => setActiveTab('deductions')}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-xs font-semibold transition ${
              activeTab === 'deductions'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-clinical-500 hover:text-clinical-700'
            }`}
          >
            Deduction History
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              activeTab === 'deductions' ? 'bg-primary-100 text-primary-700' : 'bg-clinical-100 text-clinical-500'
            }`}>
              {usageEntries.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-xs font-semibold transition ${
              activeTab === 'activity'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-clinical-500 hover:text-clinical-700'
            }`}
          >
            Activity Log
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              activeTab === 'activity' ? 'bg-primary-100 text-primary-700' : 'bg-clinical-100 text-clinical-500'
            }`}>
              {activityEntries.length}
            </span>
          </button>
        </div>

        {activeTab === 'deductions' ? (
          <>
            <div className="flex items-end justify-between">
              <p className="text-xs text-clinical-400">Recorded procedure deductions</p>
              <div className="text-right">
                <p className="text-lg font-bold leading-none text-clinical-900">{totalUsed}</p>
                <p className="text-[11px] text-clinical-400">{item.unit} used</p>
              </div>
            </div>

            <div className="mt-4 inline-flex rounded-lg border border-clinical-200 bg-white p-0.5">
              {([7, 30, 90] as const).map(range => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setHistoryRange(range)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    historyRange === range
                      ? 'bg-clinical-800 text-white'
                      : 'text-clinical-500 hover:bg-clinical-50 hover:text-clinical-800'
                  }`}
                >
                  {range} days
                </button>
              ))}
            </div>

            {procedureBreakdown.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setProcedureFilter('all')}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                    procedureFilter === 'all'
                      ? 'border-primary-300 bg-primary-50 text-primary-700'
                      : 'border-clinical-200 bg-white text-clinical-600 hover:border-primary-300'
                  }`}
                >
                  All procedures
                </button>
                {procedureBreakdown.map(({ procedure, qty }) => (
                  <button
                    key={procedure}
                    type="button"
                    onClick={() => setProcedureFilter(procedure)}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                      procedureFilter === procedure
                        ? 'border-primary-300 bg-primary-50 text-primary-700'
                        : 'border-clinical-200 bg-white text-clinical-600 hover:border-primary-300'
                    }`}
                  >
                    {procedure} <span className="ml-1 opacity-60">{qty}</span>
                  </button>
                ))}
              </div>
            )}

            {filteredEntries.length > 0 ? (
              <div className="mt-4 divide-y divide-clinical-100 rounded-xl border border-clinical-200">
                {filteredEntries.slice(0, 20).map(entry => (
                  <div key={entry.id} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-clinical-700">{entry.procedure}</p>
                      <p className="mt-1 truncate text-[11px] text-clinical-400">
                        {entry.performedBy} · Patient {entry.patientId}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold text-clinical-700">-{entry.qty} {item.unit}</p>
                      <p className="mt-1 text-[11px] text-clinical-400">
                        {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-clinical-200 px-4 py-8 text-center">
                <IconClock className="mx-auto h-5 w-5 text-clinical-300" />
                <p className="mt-2 text-xs font-medium text-clinical-600">
                  {procedureFilter === 'all' ? 'No consumption recorded in this period' : 'No deductions for this procedure'}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-clinical-400">
              Alerts, stock decisions, and order events recorded for this item.
            </p>
            {activityEntries.length > 0 ? (
              <div className="mt-4 divide-y divide-clinical-100 rounded-xl border border-clinical-200">
                {activityEntries.slice(0, 40).map(entry => (
                  <ActivityRow key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-clinical-200 px-4 py-8 text-center">
                <IconClock className="mx-auto h-5 w-5 text-clinical-300" />
                <p className="mt-2 text-xs font-medium text-clinical-600">No activity recorded for this item yet</p>
                <p className="mt-1 text-[11px] text-clinical-400">
                  Alerts, orders, and configuration changes will appear here.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const icon = (() => {
    if (entry.source === 'order') {
      if (entry.action.startsWith('Physical receipt')) return <IconCheck className="h-3.5 w-3.5" />;
      if (entry.action.startsWith('PO dispatched')) return <IconMail className="h-3.5 w-3.5" />;
      if (entry.action.startsWith('Auto-drafted') || entry.action.startsWith('Backup order')) return <IconPackage className="h-3.5 w-3.5" />;
      if (entry.action.startsWith('Rerouted')) return <IconExternalLink className="h-3.5 w-3.5" />;
      if (entry.action.startsWith('Order cancelled')) return <IconX className="h-3.5 w-3.5" />;
      if (entry.action.startsWith('Doctor classified') || entry.action.startsWith('Doctor reclassified')) return <IconCheck className="h-3.5 w-3.5" />;
      if (entry.action.startsWith('Purchase Order printed')) return <IconPrinter className="h-3.5 w-3.5" />;
      if (entry.action.startsWith('Status - Being Delivered')) return <IconPackage className="h-3.5 w-3.5" />;
      return <IconClock className="h-3.5 w-3.5" />;
    }
    if (entry.action.startsWith('Alert')) return <IconBell className="h-3.5 w-3.5" />;
    if (entry.action.startsWith('Batch discarded')) return <IconTrash className="h-3.5 w-3.5" />;
    if (entry.action.startsWith('Item created') || entry.action.startsWith('Item updated')) return <IconPencil className="h-3.5 w-3.5" />;
    if (entry.action.startsWith('Item deleted')) return <IconTrash className="h-3.5 w-3.5" />;
    return <IconClock className="h-3.5 w-3.5" />;
  })();

  const toneClasses = (() => {
    if (entry.source === 'order') {
      if (entry.action.includes('cancelled') || entry.action.includes('reclassified')) return 'bg-warning-50 text-warning-700';
      if (entry.action.startsWith('Physical receipt')) return 'bg-success-50 text-success-700';
      return 'bg-primary-50 text-primary-700';
    }
    if (entry.action.startsWith('Alert fired')) return 'bg-warning-50 text-warning-700';
    if (entry.action.startsWith('Alert')) return 'bg-success-50 text-success-700';
    if (entry.action.startsWith('Item deleted') || entry.action.startsWith('Batch discarded')) return 'bg-alert-50 text-alert-700';
    return 'bg-clinical-100 text-clinical-600';
  })();

  const sourceLabel = entry.source === 'order' ? 'Order' : 'Stock';
  const sourceBadge = entry.source === 'order'
    ? 'bg-primary-50 text-primary-700'
    : 'bg-clinical-100 text-clinical-500';

  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-xs font-medium text-clinical-700">{entry.action}</p>
          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${sourceBadge}`}>
            {sourceLabel}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-clinical-500">{entry.detail}</p>
      </div>
      <p className="shrink-0 font-mono text-[10px] text-clinical-400">{entry.timestamp}</p>
    </div>
  );
}

// ── ItemDrawer — view OR edit mode via initialMode ───────────

interface ItemDrawerProps {
  item?: InventoryRow;
  initialMode?: 'view' | 'edit';
  initialTab?: DetailTab;
  onSave: (item: InventoryItem) => void;
  onClose: () => void;
}

function ItemDrawer({ item, initialMode = 'view', initialTab, onSave, onClose }: ItemDrawerProps) {
  const { suppliers } = useClinic();
  const isNew = !item;
  const source = item?.sourceItem;

  const [editing, setEditing] = useState(isNew || initialMode === 'edit');

  const [name, setName] = useState(source?.name ?? '');
  const [category, setCategory] = useState(source?.category ?? 'Restorative');
  const [unit, setUnit] = useState(source?.unit ?? 'unit');
  const [criticalThreshold, setCriticalThreshold] = useState(source?.criticalThreshold ?? 5);
  const [reorderThreshold, setReorderThreshold] = useState(source?.reorderThreshold ?? 10);
  const [overstockThreshold, setOverstockThreshold] = useState(source?.overstockThreshold ?? 50);
  const [error, setError] = useState('');

  const resetForm = () => {
    setName(source?.name ?? '');
    setCategory(source?.category ?? 'Restorative');
    setUnit(source?.unit ?? 'unit');
    setCriticalThreshold(source?.criticalThreshold ?? 5);
    setReorderThreshold(source?.reorderThreshold ?? 10);
    setOverstockThreshold(source?.overstockThreshold ?? 50);
    setError('');
  };

  const handleCancel = () => {
    if (isNew) {
      onClose();
    } else {
      resetForm();
      setEditing(false);
    }
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError('Item name is required.'); return; }
    if (criticalThreshold >= reorderThreshold) {
      setError('Critical Low must be strictly less than Low / Reorder.');
      return;
    }
    if (reorderThreshold >= overstockThreshold) {
      setError('Low / Reorder must be strictly less than Overstock / Max.');
      return;
    }

    const nextItem: InventoryItem = {
      id: source?.id ?? `I${String(Date.now()).slice(-3)}`,
      name: name.trim(),
      category,
      unit,
      unitCost: source?.unitCost ?? 0,
      supplierId: source?.supplierId ?? suppliers[0]?.id ?? 'S01',
      backupSupplierIds: source?.backupSupplierIds ?? [],
      quantity: source?.quantity ?? 0,
      criticalThreshold,
      reorderThreshold,
      overstockThreshold,
      batches: source?.batches ?? [],
    };
    onSave(nextItem);
    onClose();
  };

  const headerTitle = !editing && item
    ? item.name
    : isNew
      ? 'Add Item'
      : 'Edit Configuration';

  const headerSubtitle = !editing && item
    ? `${item.category} · Master supply record`
    : isNew
      ? 'Register a new supply item'
      : `Updating ${item?.name ?? ''}`;

  return (
    <DrawerShell onClose={onClose}>
      <form onSubmit={handleSave} className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-clinical-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <button type="button" onClick={onClose} aria-label="Close" className="mt-1 rounded-lg p-2 text-clinical-500 hover:bg-clinical-100 hover:text-clinical-900">
              <IconX className="h-5 w-5" />
            </button>
            <div>
              <p className="font-display text-lg font-semibold text-clinical-900">{headerTitle}</p>
              <p className="mt-0.5 text-xs text-clinical-500">{headerSubtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!editing && item ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-clinical-200 bg-white px-4 py-2.5 text-sm font-semibold text-clinical-700 hover:bg-clinical-50"
              >
                <IconPencil className="h-4 w-4" /> Edit Configuration
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border border-clinical-200 bg-white px-4 py-2.5 text-sm font-semibold text-clinical-700 hover:bg-clinical-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-800"
                >
                  {isNew ? 'Save Item' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>

        {!editing && item ? (
          <ItemDetails item={item} initialTab={initialTab} />
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {error && (
              <div className="mb-4 rounded-lg border border-alert-200 bg-alert-50 px-4 py-3 text-xs text-alert-700">
                {error}
              </div>
            )}

            <section className="border-b border-clinical-200 pb-7">
              <p className="mb-5 font-semibold text-clinical-900">Item identity</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Item Name">
                    <input
                      className={inputClass}
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Composite Resin A2"
                      required
                    />
                  </Field>
                </div>
                <Field label="Category">
                  <select className={inputClass} value={category} onChange={e => setCategory(e.target.value)}>
                    <option>Restorative</option>
                    <option>Anesthetics</option>
                    <option>Consumables</option>
                    <option>Isolation</option>
                  </select>
                </Field>
                <Field label="Unit" hint="syringe / bottle / pack / pair">
                  <input
                    className={inputClass}
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="unit"
                  />
                </Field>
              </div>
            </section>

            <section className="py-7">
              <p className="mb-4 font-semibold text-clinical-900">Alert thresholds</p>
              <p className="mb-4 text-xs leading-relaxed text-clinical-400">
                Must satisfy <strong className="text-clinical-600">Critical Low &lt; Low / Reorder &lt; Overstock / Max</strong>.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Critical Low">
                  <input
                    type="number"
                    className={inputClass}
                    value={criticalThreshold}
                    onChange={e => setCriticalThreshold(Number(e.target.value) || 0)}
                    min="0"
                  />
                </Field>
                <Field label="Low / Reorder">
                  <input
                    type="number"
                    className={inputClass}
                    value={reorderThreshold}
                    onChange={e => setReorderThreshold(Number(e.target.value) || 0)}
                    min="0"
                  />
                </Field>
                <Field label="Overstock / Max">
                  <input
                    type="number"
                    className={inputClass}
                    value={overstockThreshold}
                    onChange={e => setOverstockThreshold(Number(e.target.value) || 0)}
                    min="0"
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-xl border border-clinical-100 bg-clinical-50/60 p-3.5">
              <p className="text-[11px] leading-relaxed text-clinical-500">
                Primary and backup supplier assignments are not editable from this drawer.
              </p>
            </section>
          </div>
        )}
      </form>
    </DrawerShell>
  );
}

// ── BatchDrawer — add / discard / manage batches ──────────────

interface AddBatchFormProps {
  unit: string;
  onSubmit: (batch: InventoryBatch) => void;
  onCancel: () => void;
}

function AddBatchForm({ unit, onSubmit, onCancel }: AddBatchFormProps) {
  const [batchNo, setBatchNo] = useState('');
  const [qty, setQty] = useState('1');
  const [expiry, setExpiry] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!batchNo.trim()) { setError('Batch / Lot ID is required.'); return; }
    const parsedQty = Number(qty);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) { setError('Quantity must be greater than 0.'); return; }
    if (!expiry) { setError('Expiration date is required.'); return; }
    if (new Date(expiry) < new Date(new Date().toDateString())) {
      setError('Expiration date cannot be in the past.');
      return;
    }
    onSubmit({ batchNo: batchNo.trim(), qty: parsedQty, expiry });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-primary-200 bg-primary-50/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-primary-800">Register new batch</p>
        <button type="button" onClick={onCancel} className="rounded p-1 text-primary-500 hover:bg-primary-100">
          <IconX className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <p className="mb-3 rounded-lg border border-alert-200 bg-alert-50 px-3 py-2 text-[11px] text-alert-700">{error}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Batch / Lot ID">
            <input
              className={inputClass}
              value={batchNo}
              onChange={e => setBatchNo(e.target.value)}
              placeholder="e.g. B2026-11A"
            />
          </Field>
        </div>
        <Field label={`Quantity (${unit})`}>
          <input
            type="number"
            min="1"
            className={inputClass}
            value={qty}
            onChange={e => setQty(e.target.value)}
          />
        </Field>
        <Field label="Expiration date">
          <input
            type="date"
            className={inputClass}
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-clinical-200 bg-white px-3 py-2 text-xs font-semibold text-clinical-700 hover:bg-clinical-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-primary-700 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-800"
        >
          Add Batch
        </button>
      </div>
    </form>
  );
}

function BatchRow({ id, quantity, timing }: { id: string; quantity: string; timing: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-clinical-200 bg-white px-4 py-3">
      <div>
        <p className="font-mono text-xs font-semibold text-clinical-800">{id}</p>
        <p className="mt-1 text-xs text-clinical-400">{timing}</p>
      </div>
      <p className="text-sm font-bold text-clinical-900">{quantity}</p>
    </div>
  );
}

function BatchDrawer({ item, onClose }: { item: InventoryRow; onClose: () => void }) {
  const { discardBatch, saveInventoryItem, expiryAlertDays, inventory } = useClinic();
  // Read the item live from context so discarding a batch / adding a batch
  // immediately reflects in the "Usable stock" header and grouped lists
  // without needing to close and reopen the drawer.
  const source = inventory.find(i => i.id === item.id) ?? item.sourceItem;

  const [showAddBatch, setShowAddBatch] = useState(false);
  const [discarded, setDiscarded] = useState<string[]>([]);
  const [removedEarly, setRemovedEarly] = useState<string[]>([]);

  const now = Date.now();
  const batches = source.batches;
  const expired = batches.filter(b => new Date(b.expiry).getTime() < now);
  const expiringSoon = batches.filter(b => {
    const t = new Date(b.expiry).getTime();
    return t >= now && t - now <= expiryAlertDays * 86400000;
  });
  const fresh = batches.filter(b => new Date(b.expiry).getTime() - now > expiryAlertDays * 86400000);

  const handleAddBatch = (batch: InventoryBatch) => {
    saveInventoryItem({
      ...source,
      quantity: source.quantity + batch.qty,
      batches: [...source.batches, batch],
    });
    setShowAddBatch(false);
  };

  return (
    <DrawerShell onClose={onClose} width="max-w-lg">
      <div className="flex items-start justify-between border-b border-clinical-200 px-6 py-5">
        <div>
          <p className="font-display text-lg font-semibold text-clinical-900">{item.name}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-clinical-400">Usable stock</span>
            <span className="text-xl font-bold text-clinical-900">{source.quantity}</span>
            <span className="text-xs text-clinical-400">{item.unit}</span>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-clinical-500 hover:bg-clinical-100">
          <IconX className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 divide-y divide-clinical-200 overflow-y-auto px-6 py-6">
        {!showAddBatch ? (
          <div className="pb-6">
            <button
              type="button"
              onClick={() => setShowAddBatch(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/40 px-4 py-3 text-sm font-semibold text-primary-700 transition hover:border-primary-400 hover:bg-primary-50"
            >
              <IconPlus className="h-4 w-4" /> Register New Batch
            </button>
          </div>
        ) : (
          <div className="pb-6">
            <AddBatchForm unit={item.unit} onSubmit={handleAddBatch} onCancel={() => setShowAddBatch(false)} />
          </div>
        )}

        {expired.length > 0 && (
          <section className="py-6 first:pt-0">
            <div className="mb-4 border-l-2 border-alert-600 pl-3">
              <p className="text-xs font-bold tracking-wider text-alert-700">EXPIRED · HAZARD</p>
              <p className="mt-1 text-xs leading-relaxed text-clinical-500">Auto-deducted from usable stock. Physical disposal required.</p>
            </div>
            {expired.map(b => {
              const done = discarded.includes(b.batchNo);
              return (
                <div key={b.batchNo} className="mb-3">
                  <BatchRow
                    id={b.batchNo}
                    quantity={`${b.qty} ${item.unit}`}
                    timing={`Expired ${Math.round((now - new Date(b.expiry).getTime()) / 86400000)} days ago`}
                  />
                  {!done ? (
                    <button
                      onClick={() => {
                        discardBatch(item.id, b.batchNo);
                        setDiscarded(prev => [...prev, b.batchNo]);
                      }}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-alert-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-alert-700"
                    >
                      <IconTrash className="h-4 w-4" /> Confirm Physical Discard
                    </button>
                  ) : (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-success-50 p-3 text-sm font-medium text-success-700">
                      <IconCheck className="h-4 w-4" /> Physical discard confirmed · stock updated
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {expiringSoon.length > 0 && (
          <section className="py-6 first:pt-0">
            <div className="mb-4 border-l-2 border-warning-500 pl-3">
              <p className="text-xs font-bold tracking-wider text-warning-700">EXPIRING SOON</p>
              <p className="mt-1 text-xs text-clinical-500">Currently usable — flagged within the alert window.</p>
            </div>
            {expiringSoon.map(b => {
              const done = removedEarly.includes(b.batchNo);
              return (
                <div key={b.batchNo} className="mb-3">
                  <BatchRow
                    id={b.batchNo}
                    quantity={`${b.qty} ${item.unit}`}
                    timing={`${Math.round((new Date(b.expiry).getTime() - now) / 86400000)} days left`}
                  />
                  {!done ? (
                    <button
                      onClick={() => {
                        discardBatch(item.id, b.batchNo);
                        setRemovedEarly(prev => [...prev, b.batchNo]);
                      }}
                      className="mt-2 w-full rounded-lg border border-clinical-200 px-4 py-2.5 text-sm font-semibold text-clinical-700 hover:bg-clinical-50"
                    >
                      Remove Batch Early
                    </button>
                  ) : (
                    <div className="mt-2 rounded-xl bg-clinical-50 p-3 text-sm text-clinical-500">Batch removed from usable stock.</div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {fresh.length > 0 && (
          <section className="py-6 first:pt-0">
            <div className="mb-4 border-l-2 border-clinical-300 pl-3">
              <p className="text-xs font-bold tracking-wider text-clinical-700">FRESH STOCK</p>
              <p className="mt-1 text-xs text-clinical-500">No action needed.</p>
            </div>
            {fresh.map(b => (
              <BatchRow
                key={b.batchNo}
                id={b.batchNo}
                quantity={`${b.qty} ${item.unit}`}
                timing={`${Math.round((new Date(b.expiry).getTime() - now) / 86400000)} days left · No action needed`}
              />
            ))}
          </section>
        )}

        {batches.length === 0 && !showAddBatch && (
          <div className="py-10 text-center">
            <IconPackage className="mx-auto h-6 w-6 text-clinical-300" />
            <p className="mt-3 text-sm font-medium text-clinical-600">No batches tracked</p>
            <p className="mt-1 text-xs text-clinical-400">Register a batch above to start tracking quantity and expiration.</p>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

// ── Alert settings popover ────────────────────────────────────

function AlertSettingsPopover({ onClose }: { onClose: () => void }) {
  const { expiryAlertDays, setExpiryAlertDays, automationConfig, setAutomationConfig } = useClinic();
  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-clinical-200 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-clinical-800">Automation Settings</p>
        <button onClick={onClose} className="text-clinical-400 hover:text-clinical-700">
          <IconX className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3 text-xs">
        <label className="block">
          <span className="mb-1 block font-medium text-clinical-600">Expiry alert window (days)</span>
          <input
            type="number"
            min="1"
            max="180"
            value={expiryAlertDays}
            onChange={e => setExpiryAlertDays(Math.max(1, Number(e.target.value) || 30))}
            className="w-full rounded-lg border border-clinical-200 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-clinical-600">Response window (hours)</span>
          <input
            type="number"
            min="1"
            value={automationConfig.responseWindowHours}
            onChange={e => setAutomationConfig({ ...automationConfig, responseWindowHours: Math.max(1, Number(e.target.value) || 24) })}
            className="w-full rounded-lg border border-clinical-200 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-clinical-600">EOD dispatch hour (0–23)</span>
          <input
            type="number"
            min="0"
            max="23"
            value={automationConfig.eodDispatchHour}
            onChange={e => setAutomationConfig({ ...automationConfig, eodDispatchHour: Math.min(23, Math.max(0, Number(e.target.value) || 18)) })}
            className="w-full rounded-lg border border-clinical-200 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
          />
        </label>

        <label className="flex items-start justify-between gap-3 rounded-lg border border-clinical-200 bg-clinical-50/60 p-2.5">
          <span className="min-w-0">
            <span className="block font-medium text-clinical-600">Immediate dispatch for Critical</span>
            <span className="mt-0.5 block text-[10px] leading-snug text-clinical-400">
              Skip the end-of-day batch for critical stock — draft and send right away.
            </span>
          </span>
          <input
            type="checkbox"
            checked={automationConfig.criticalImmediate}
            onChange={e => setAutomationConfig({ ...automationConfig, criticalImmediate: e.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
          />
        </label>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────

function DeleteItemConfirm({ item, onConfirm, onCancel }: { item: InventoryRow; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <button aria-label="Cancel" onClick={onCancel} className="absolute inset-0 bg-clinical-900/40" />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-alert-50 text-alert-600">
            <IconTrash className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-clinical-900">Delete inventory item?</p>
            <p className="mt-1 text-xs leading-relaxed text-clinical-500">
              <strong className="text-clinical-700">{item.name}</strong> will be removed from the master supply list.
              Historical deduction entries are retained in the audit log, but the item can no longer receive new deductions.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-clinical-200 bg-white px-4 py-2.5 text-sm font-semibold text-clinical-700 hover:bg-clinical-50">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-alert-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-alert-700">
            Delete Item
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Inventory component ──────────────────────────────────

interface InventoryProps {
  initialEditItemName?: string | null;
  onNavigateToOrder?: (orderId: string) => void;
}

export default function Inventory({ initialEditItemName, onNavigateToOrder }: InventoryProps = {}) {
  const pageSize = 10;
  const {
    inventory,
    orders,
    inventoryAlertLog,
    getStockStatus,
    isExpired,
    isExpiringSoon,
    acknowledgeAlert,
    saveInventoryItem,
    removeInventoryItem,
  } = useClinic();

  const [primaryView, setPrimaryView] = useState<PrimaryView>('stock');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemDrawer, setItemDrawer] = useState<DrawerState | null>(null);
  const [batchItem, setBatchItem] = useState<InventoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryRow | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const connectedInventoryRows = useMemo(
    () => buildInventoryRows(inventory, inventoryAlertLog, orders, getStockStatus, isExpired, isExpiringSoon),
    [inventory, inventoryAlertLog, orders, getStockStatus, isExpired, isExpiringSoon],
  );

  const filteredItems = useMemo(() => connectedInventoryRows.filter(item => {
    const searchable = `${item.name} ${item.category} ${item.id} ${item.expiryDetail}`.toLowerCase();
    const matchesSearch = searchable.includes(query.toLowerCase());
    const matchesFilter = filter === 'all'
      || (filter === 'expired' && item.expiry === 'expired')
      || (filter === 'low' && ['low', 'critical'].includes(item.stock))
      || (filter === 'expiring' && item.expiry === 'expiring');
    return matchesSearch && matchesFilter;
  }), [connectedInventoryRows, filter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const visibleItems = filteredItems.slice(pageStart, pageStart + pageSize);
  const rangeStart = filteredItems.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = Math.min(pageStart + pageSize, filteredItems.length);

  const unacknowledgedCount = inventoryAlertLog.filter(a => !a.acknowledged).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, query]);

  useEffect(() => {
    if (!initialEditItemName) return;
    const item = connectedInventoryRows.find(row => row.name === initialEditItemName);
    if (item) {
      setPrimaryView('stock');
      setItemDrawer({ kind: 'edit', item });
    }
  }, [connectedInventoryRows, initialEditItemName]);

  useEffect(() => {
    if (!menuId) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && !target.closest('[data-inventory-menu]')) {
        setMenuId(null);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [menuId]);

  useEffect(() => {
    if (!showSettings) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && !target.closest('[data-inventory-settings]')) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [showSettings]);

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'expired', label: 'EXPIRED', count: connectedInventoryRows.filter(item => item.expiry === 'expired').length },
    { id: 'all', label: 'All', count: connectedInventoryRows.length },
    { id: 'low', label: 'Low/Critical', count: connectedInventoryRows.filter(item => ['low', 'critical'].includes(item.stock)).length },
    { id: 'expiring', label: 'Expiring', count: connectedInventoryRows.filter(item => item.expiry === 'expiring').length },
  ];

  return (
    <div className="mx-auto max-w-[1500px] p-6 lg:p-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight text-clinical-900">Inventory</p>
          <p className="mt-0.5 text-xs text-clinical-500">Live stock, thresholds, and deduction history.</p>
        </div>
        <div className="relative" data-inventory-settings>
          <button
            onClick={() => setShowSettings(current => !current)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              showSettings
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-clinical-200 bg-white text-clinical-600 hover:border-primary-300'
            }`}
          >
            <IconSettings className="h-4 w-4" />
            Automation Settings
          </button>
          {showSettings && <AlertSettingsPopover onClose={() => setShowSettings(false)} />}
        </div>
      </div>

      <div className="mb-6 inline-flex rounded-lg border border-clinical-200 bg-white p-0.5">
        <button
          onClick={() => setPrimaryView('stock')}
          className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition ${
            primaryView === 'stock'
              ? 'bg-clinical-800 text-white'
              : 'text-clinical-600 hover:bg-clinical-50 hover:text-clinical-800'
          }`}
        >
          <IconPackage className="h-4 w-4" /> Stock
        </button>
        <button
          onClick={() => setPrimaryView('alerts')}
          className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition ${
            primaryView === 'alerts'
              ? 'bg-clinical-800 text-white'
              : 'text-clinical-600 hover:bg-clinical-50 hover:text-clinical-800'
          }`}
        >
          <IconBell className="h-4 w-4" /> Alerts
          {unacknowledgedCount > 0 && (
            <span className={`ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
              primaryView === 'alerts'
                ? 'bg-white/20 text-white'
                : 'bg-warning-100 text-warning-800'
            }`}>
              {unacknowledgedCount}
            </span>
          )}
        </button>
      </div>

      {primaryView === 'stock' && (
        <>
          <div className="mb-5 flex items-center gap-3">
            <div className="relative max-w-2xl flex-1">
              <IconSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-clinical-400" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search item, category, batch, supplier..."
                className="w-full rounded-full border border-clinical-200 bg-white py-3 pl-12 pr-4 text-sm text-clinical-800 shadow-sm outline-none transition placeholder:text-clinical-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <button
              onClick={() => setItemDrawer({ kind: 'new' })}
              className="flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-800"
            >
              <IconPlus className="h-4 w-4" /> Add Item
            </button>
          </div>

          <div className="mb-4 flex items-center gap-1 border-b border-clinical-200">
            {tabs.map(tab => {
              const active = filter === tab.id;
              const hazard = tab.id === 'expired';
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`relative px-4 py-3 text-xs font-semibold transition ${
                    active
                      ? hazard ? 'text-alert-700' : 'text-primary-800'
                      : hazard ? 'text-alert-600 hover:bg-alert-50' : 'text-clinical-500 hover:text-clinical-800'
                  }`}
                >
                  {tab.label} ({tab.count})
                  {active && <span className={`absolute inset-x-2 bottom-0 h-0.5 ${hazard ? 'bg-alert-600' : 'bg-primary-700'}`} />}
                </button>
              );
            })}
          </div>

          <div className="overflow-visible rounded-xl border border-clinical-200 bg-white shadow-sm">
            <table className="w-full table-auto text-left text-sm">
              <thead>
                <tr className="border-b border-clinical-200 bg-clinical-50/80 text-[11px] font-semibold uppercase tracking-wider text-clinical-500">
                  <th className="min-w-44 px-5 py-3.5">Item</th>
                  <th className="min-w-28 px-4 py-3.5">Usable Qty</th>
                  <th className="min-w-44 px-4 py-3.5">Expiry</th>
                  <th className="min-w-32 px-4 py-3.5">Stock Status</th>
                  <th className="min-w-64 px-4 py-3.5">System Action</th>
                  <th className="sticky right-0 w-12 bg-clinical-50 px-3 py-3.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-clinical-100">
                {visibleItems.map(item => (
                  <tr key={item.id} className="group transition hover:bg-clinical-50/60">
                    <td className="px-5 py-5 align-top">
                      <p className="font-semibold text-clinical-900">{item.name}</p>
                      <p className="mt-1 text-xs text-clinical-400">{item.category} · {item.id}</p>
                    </td>
                    <td className="px-4 py-5 align-top">
                      <p className="text-lg font-bold leading-none text-clinical-900">
                        {item.quantity} <span className="text-sm font-normal text-clinical-400">/ {item.max}</span>
                      </p>
                      <p className="mt-2 text-xs text-clinical-400">{item.unit}</p>
                    </td>
                    <td className="px-4 py-5 align-top">
                      <ExpiryCell item={item} />
                    </td>
                    <td className="px-4 py-5 align-top">
                      <StatusBadge status={item.stock} />
                    </td>
                    <td className="px-4 py-5 align-top">
                      <SystemAction
                        item={item}
                        onManage={() => setBatchItem(item)}
                        onAcknowledge={() => item.activeAlert && acknowledgeAlert(item.activeAlert.id)}
                        onViewOrder={(orderId) => onNavigateToOrder?.(orderId)}
                        onViewDeductions={() => setItemDrawer({ kind: 'view', item })}
                      />
                    </td>
                    <td className={`sticky right-0 bg-white px-3 py-5 align-top transition group-hover:bg-clinical-50 ${menuId === item.id ? 'z-40' : 'z-10'}`}>
                      <div className="relative" data-inventory-menu>
                        <button
                          onClick={() => setMenuId(menuId === item.id ? null : item.id)}
                          aria-label={`Actions for ${item.name}`}
                          className="rounded-lg p-1.5 text-clinical-400 hover:bg-clinical-100 hover:text-clinical-800"
                        >
                          <IconMore className="h-5 w-5" />
                        </button>
                        {menuId === item.id && (
                          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-clinical-200 bg-white py-1.5 shadow-xl">
                            <button
                              onClick={() => { setItemDrawer({ kind: 'view', item }); setMenuId(null); }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-clinical-700 hover:bg-clinical-50"
                            >
                              <IconSettings className="h-4 w-4 shrink-0 text-clinical-500" />
                              View Details
                            </button>
                            <button
                              onClick={() => { setItemDrawer({ kind: 'edit', item }); setMenuId(null); }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-clinical-700 hover:bg-clinical-50"
                            >
                              <IconPencil className="h-4 w-4 shrink-0 text-clinical-500" />
                              Edit Configuration
                            </button>
                            <button
                              onClick={() => { setBatchItem(item); setMenuId(null); }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-clinical-700 hover:bg-clinical-50"
                            >
                              <IconPackage className="h-4 w-4 shrink-0 text-clinical-500" />
                              Manage Batches
                            </button>
                            <div className="my-1 border-t border-clinical-100" />
                            <button
                              onClick={() => { setDeleteTarget(item); setMenuId(null); }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-alert-700 hover:bg-alert-50"
                            >
                              <IconTrash className="h-4 w-4 shrink-0 text-alert-500" />
                              Delete Item
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <IconSearch className="mx-auto h-6 w-6 text-clinical-300" />
                      <p className="mt-3 text-sm font-medium text-clinical-700">No inventory items found</p>
                      <p className="mt-1 text-xs text-clinical-400">Try another search or filter.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-clinical-100 px-5 py-3">
              <p className="text-xs text-clinical-400">
                {unacknowledgedCount} open alert{unacknowledgedCount === 1 ? '' : 's'} across inventory
              </p>
              <div className="flex items-center gap-3 text-xs text-clinical-500">
                <button
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  className="rounded p-1 text-clinical-500 transition hover:bg-clinical-100 hover:text-clinical-800 disabled:cursor-not-allowed disabled:text-clinical-300"
                >
                  <IconChevronRight className="h-4 w-4 rotate-180" />
                </button>
                <span>{rangeStart}-{rangeEnd} of {filteredItems.length}</span>
                <button
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  className="rounded p-1 text-clinical-500 transition hover:bg-clinical-100 hover:text-clinical-800 disabled:cursor-not-allowed disabled:text-clinical-300"
                >
                  <IconChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {primaryView === 'alerts' && (
        <AlertsView
          rows={connectedInventoryRows}
          onAcknowledge={acknowledgeAlert}
          onViewOrder={(id) => onNavigateToOrder?.(id)}
          onViewItem={(row) => setItemDrawer({ kind: 'view', item: row })}
          onManageBatches={(row) => setBatchItem(row)}
        />
      )}

      {itemDrawer && (
        <ItemDrawer
          item={itemDrawer.kind === 'new' ? undefined : itemDrawer.item}
          initialMode={itemDrawer.kind === 'edit' || itemDrawer.kind === 'new' ? 'edit' : 'view'}
          onSave={saveInventoryItem}
          onClose={() => setItemDrawer(null)}
        />
      )}

      {batchItem && <BatchDrawer item={batchItem} onClose={() => setBatchItem(null)} />}

      {deleteTarget && (
        <DeleteItemConfirm
          item={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            removeInventoryItem(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
