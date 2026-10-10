import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  IconAlert,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconDownload,
  IconExternalLink,
  IconMail,
  IconMoreVertical,
  IconPackage,
  IconPrinter,
  IconSearch,
  IconX,
} from '../icons';
import {
  useClinic,
  type SupplyOrder,
  type OrderStatus,
  type OrderTimelineEvent,
  type Supplier,
  type ResponseClass,
} from '../../context/ClinicContext';

// ── Display adapter ───────────────────────────────────────────

type FilterTab = 'action' | 'all' | 'pending' | 'completed';

interface DisplayOrder {
  order: SupplyOrder;
  supplier: Supplier | undefined;
  route: string;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  queued: 'Queued for Dispatch',
  sent: 'Awaiting Response',
  confirmed: 'Confirmed',
  being_delivered: 'Being Delivered',
  unavailable: 'Supplier Unavailable',
  no_response: 'No Response',
  unclear: 'Unclear Response',
  rerouted: 'Rerouted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function isActionRequired(status: OrderStatus): boolean {
  return ['unavailable', 'no_response', 'unclear'].includes(status);
}

function isPending(status: OrderStatus): boolean {
  return ['queued', 'sent', 'confirmed', 'being_delivered', 'rerouted'].includes(status);
}

function isTerminal(status: OrderStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

/**
 * Whether the doctor can physically receive this order.
 *
 * Excludes `rerouted` parents: the parent has already handed off to a backup
 * child, and confirming receipt on the parent would restock the same physical
 * delivery twice — once against the parent, once against the child.
 */
function canReceiveDelivery(status: OrderStatus): boolean {
  return !isTerminal(status) && status !== 'rerouted';
}

const RESPONSE_LABELS: Record<ResponseClass, string> = {
  confirmed: 'Confirmed',
  unavailable: 'Unavailable',
  no_response: 'No Response',
  unclear: 'Unclear',
};

// ── Status badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const cls =
    status === 'unavailable' || status === 'no_response' ? 'border-alert-100 bg-alert-50 text-alert-700'
    : status === 'unclear' ? 'border-warning-100 bg-warning-50 text-warning-700'
    : status === 'completed' ? 'border-success-100 bg-success-50 text-success-700'
    : status === 'cancelled' ? 'border-clinical-200 bg-clinical-100 text-clinical-600'
    : status === 'being_delivered' ? 'border-primary-100 bg-primary-50 text-primary-700'
    : status === 'rerouted' ? 'border-warning-100 bg-warning-50 text-warning-700'
    : 'border-primary-100 bg-primary-50 text-primary-600';

  const Icon =
    status === 'unavailable' || status === 'no_response' ? IconAlert
    : status === 'completed' ? IconCheck
    : status === 'unclear' || status === 'rerouted' ? IconClock
    : status === 'being_delivered' ? IconPackage
    : status === 'cancelled' ? IconX
    : IconClock;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Overlay / drawer shells ───────────────────────────────────

function Overlay({ children, align = 'right', onClose }: { children: ReactNode; align?: 'right' | 'center'; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className={`fixed inset-0 z-50 flex ${align === 'right' ? 'justify-end' : 'items-center justify-center p-6'}`}>
      <button aria-label="Close overlay" onClick={onClose} className="absolute inset-0 bg-clinical-900/30" />
      {children}
    </div>
  );
}

// ── Full email modal ──────────────────────────────────────────

interface EmailSnippet {
  sender: string;
  before: string;
  keyword: string;
  after: string;
}

function FullEmailModal({
  order,
  snippet,
  date,
  onClose,
}: {
  order: SupplyOrder;
  snippet: EmailSnippet;
  date: string;
  onClose: () => void;
}) {
  return (
    <Overlay align="center" onClose={onClose}>
      <section className="relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-clinical-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-clinical-400">Supplier email</p>
            <p className="mt-1.5 font-display text-lg font-semibold text-clinical-900">Re: {order.poRef} purchase order</p>
          </div>
          <button onClick={onClose} aria-label="Close email" className="rounded-lg p-2 text-clinical-500 hover:bg-clinical-100">
            <IconX className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="rounded-xl border border-clinical-200 bg-clinical-50 p-4">
            <div className="grid grid-cols-4 gap-x-3 gap-y-2 text-sm">
              <span className="font-semibold text-clinical-400">From</span>
              <span className="col-span-3 text-clinical-700">{snippet.sender}</span>
              <span className="font-semibold text-clinical-400">To</span>
              <span className="col-span-3 text-clinical-700">procurement@premierdental.ph</span>
              <span className="font-semibold text-clinical-400">Date</span>
              <span className="col-span-3 text-clinical-700">{date}</span>
            </div>
          </div>
          <div className="mt-6 whitespace-pre-line text-sm leading-7 text-clinical-700">
            {`Hello Premier Dental,\n\nThank you for your purchase order. ${snippet.before}${snippet.keyword}${snippet.after}\n\nPlease contact our order desk if you require an alternative item or an updated availability estimate.\n\nRegards,\nSupplier Order Desk`}
          </div>
        </div>
      </section>
    </Overlay>
  );
}

// ── Override classification modal ─────────────────────────────

function OverrideClassificationModal({
  order,
  onClose,
  onApply,
}: {
  order: SupplyOrder;
  onClose: () => void;
  onApply: (cls: ResponseClass, reason?: string) => void;
}) {
  // An order reaches this modal either because it was auto-classified as
  // `unclear` (needs the doctor to say what the reply actually means), or
  // because the doctor is correcting an already-classified response.
  // The `unclear` sentinel is never a valid target — it's the absence of a
  // classification the parser could act on.
  const isInitialClassification = !order.responseClass || order.responseClass === 'unclear';

  const initialCls: ResponseClass =
    order.responseClass && order.responseClass !== 'unclear' ? order.responseClass : 'confirmed';
  const [cls, setCls] = useState<ResponseClass>(initialCls);
  const [reason, setReason] = useState('');

  const currentLabel = order.responseClass ? RESPONSE_LABELS[order.responseClass] : 'Not yet classified';
  const options: { id: ResponseClass; label: string; hint: string; tone: 'success' | 'alert' }[] = [
    {
      id: 'confirmed',
      label: 'Proceed — order will go through',
      hint: 'Move the order to Being Delivered. Use this after clarifying with the supplier.',
      tone: 'success',
    },
    {
      id: 'unavailable',
      label: 'Reroute — supplier can\u2019t fulfill',
      hint: 'Auto-send to the next backup supplier in the chain.',
      tone: 'alert',
    },
    {
      id: 'no_response',
      label: 'Reroute — no reply from supplier',
      hint: 'Treat as timed out and auto-send to the next backup supplier.',
      tone: 'alert',
    },
  ];

  // For an ambiguous reply being asserted as Proceed, the audit trail needs
  // the doctor's own words — otherwise there is no record of why the order
  // was allowed through when the supplier never said "yes" in writing.
  const reasonRequired = isInitialClassification && cls === 'confirmed';
  const canSubmit = !reasonRequired || reason.trim().length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onApply(cls, reason.trim() || undefined);
  };

  return (
    <Overlay align="center" onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        className="relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-clinical-200 px-6 py-5">
          <div>
            <p className="font-display text-lg font-semibold text-clinical-900">
              {isInitialClassification ? 'Classify supplier response' : 'Override classification'}
            </p>
            <p className="mt-0.5 text-xs text-clinical-500">
              {order.poRef} · Currently: <span className="font-semibold text-clinical-700">{currentLabel}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-clinical-500 hover:bg-clinical-100">
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {isInitialClassification ? (
            <p className="text-xs leading-relaxed text-clinical-500">
              The supplier&rsquo;s reply wasn&rsquo;t clear enough to classify automatically. If it reads like a
              question &mdash; <em>&ldquo;which variant?&rdquo;</em>, <em>&ldquo;which size?&rdquo;</em> &mdash; call the supplier to clarify,
              then record the outcome below.
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-clinical-500">
              Reclassify the supplier response at any time. The order will follow the new
              path immediately, and the change is recorded in the audit trail.
            </p>
          )}

          <div className="space-y-2">
            {options.map(opt => {
              const selected = cls === opt.id;
              const selectedStyles =
                opt.tone === 'success'
                  ? 'border-success-300 bg-success-50'
                  : 'border-alert-300 bg-alert-50';
              return (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    selected ? selectedStyles : 'border-clinical-200 bg-white hover:border-clinical-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="classification"
                    checked={selected}
                    onChange={() => setCls(opt.id)}
                    className="mt-0.5 h-4 w-4 accent-primary-600"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-clinical-800">{opt.label}</p>
                    <p className="mt-0.5 text-[11px] text-clinical-500">{opt.hint}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-clinical-700">
              Reason{' '}
              {reasonRequired ? (
                <span className="font-normal text-alert-600">(required)</span>
              ) : (
                <span className="font-normal text-clinical-400">(optional)</span>
              )}
            </span>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder={
                reasonRequired
                  ? 'e.g. Called supplier — confirmed 5ml variant, shipping tomorrow'
                  : 'e.g. Called supplier — 5ml version available, confirming shipment'
              }
              className={`w-full resize-none rounded-lg border bg-white px-3 py-2 text-sm text-clinical-800 outline-none transition focus:ring-2 placeholder:text-clinical-300 ${
                reasonRequired && !canSubmit
                  ? 'border-alert-300 focus:border-alert-500 focus:ring-alert-100'
                  : 'border-clinical-200 focus:border-primary-500 focus:ring-primary-100'
              }`}
            />
            {reasonRequired && !canSubmit && (
              <p className="mt-1 text-[10px] text-alert-600">
                A short reason is required — the supplier never said &ldquo;yes&rdquo; in writing, so this is the only record of why the order proceeds.
              </p>
            )}
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-clinical-200 bg-clinical-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-clinical-200 bg-white px-4 py-2.5 text-xs font-semibold text-clinical-700 hover:bg-clinical-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-primary-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-clinical-200 disabled:text-clinical-400"
          >
            {isInitialClassification ? 'Record classification' : 'Apply override'}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

// ── Timeline drawer ───────────────────────────────────────────

function TimelineDrawer({
  order,
  timeline,
  onClose,
  onCancelOrder,
  onReceiveDelivery,
  onOpenClassify,
}: {
  order: SupplyOrder;
  timeline: OrderTimelineEvent[];
  onClose: () => void;
  onCancelOrder: (orderId: string) => void;
  onReceiveDelivery: (order: SupplyOrder) => void;
  onOpenClassify: (order: SupplyOrder) => void;
}) {
  const { suppliers } = useClinic();
  const supplier = suppliers.find(s => s.id === order.supplierId);
  const events = timeline;
  const [exported, setExported] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<{ snippet: EmailSnippet; date: string } | null>(null);
  const requiresIntervention = isActionRequired(order.status);
  const canAct = !isTerminal(order.status);
  const isUnclear = order.status === 'unclear';

  // Print-to-PDF acts as the "export" — the drawer body is wrapped in
  // #audit-print-region and the print CSS lifts it into a clean sheet.
  const handlePrint = () => {
    setExported(true);
    window.print();
  };

  return (
    <>
      <Overlay onClose={onClose}>
        <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-clinical-200 px-7 py-6">
          <div>
            <p className="font-display text-lg font-semibold text-clinical-900">{order.poRef}</p>
            <p className="mt-1 text-sm text-clinical-500">{supplier?.name ?? order.supplierId} · {order.originalOrderId ? 'Backup · Auto-reroute' : 'Primary'}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-clinical-500 hover:bg-clinical-100"><IconX className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-7">
          <div id="audit-print-region">
            <p className="mb-7 text-xs font-semibold uppercase tracking-wider text-clinical-400">Order audit trail</p>
            {events.length === 0 ? (
              <div className="rounded-xl border border-dashed border-clinical-200 px-5 py-10 text-center">
                <IconClock className="mx-auto h-5 w-5 text-clinical-300" />
                <p className="mt-3 text-xs font-medium text-clinical-600">No events recorded yet</p>
                <p className="mt-1 text-[11px] text-clinical-400">Events will appear here as the order progresses.</p>
              </div>
            ) : (
              <div className="relative ml-3 border-l border-clinical-200 pl-8">
                {events.map((event, index) => {
                  const EventIcon =
                    event.kind === 'created' ? IconPackage
                    : event.kind === 'dispatched' ? IconMail
                    : event.kind === 'reply-parsed' ? IconMail
                    : event.kind === 'classified' ? IconCheck
                    : event.kind === 'reclassified' ? IconCheck
                    : event.kind === 'rerouted' ? IconExternalLink
                    : event.kind === 'timeout' ? IconClock
                    : event.kind === 'escalated' ? IconAlert
                    : event.kind === 'received' ? IconCheck
                    : event.kind === 'cancelled' ? IconX
                    : IconPackage;
                  const tone =
                    event.kind === 'received' || event.kind === 'classified' ? 'success'
                    : event.kind === 'reclassified' ? 'warning'
                    : event.kind === 'escalated' || event.kind === 'timeout' ? 'alert'
                    : event.kind === 'cancelled' ? 'neutral'
                    : event.kind === 'rerouted' ? 'warning'
                    : 'primary';
                  const toneClasses =
                    tone === 'success' ? 'border-success-100 text-success-700'
                    : tone === 'alert' ? 'border-alert-100 text-alert-700'
                    : tone === 'warning' ? 'border-warning-100 text-warning-700'
                    : tone === 'neutral' ? 'border-clinical-200 text-clinical-500'
                    : 'border-clinical-200 text-primary-700';
                  return (
                    <div key={event.id} className={index < events.length - 1 ? 'pb-8' : 'pb-2'}>
                      <span className={`absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm ${toneClasses}`}>
                        <EventIcon className="h-4 w-4" />
                      </span>
                      <p className="text-xs font-medium text-clinical-400">{event.timestamp}</p>
                      <p className="mt-1.5 text-sm font-semibold text-clinical-900">{event.title}</p>
                      {event.emailSnippet ? (
                        <div className="mt-3 rounded-lg border border-clinical-200 bg-clinical-50 p-3.5">
                          <p className="truncate text-xs text-clinical-400">{event.emailSnippet.sender}</p>
                          <p className="mt-2 text-sm italic leading-relaxed text-clinical-600">
                            &ldquo;{event.emailSnippet.before}
                            <span className="rounded bg-warning-100 px-1 py-0.5 font-semibold text-warning-700">{event.emailSnippet.keyword}</span>
                            {event.emailSnippet.after}&rdquo;
                          </p>
                          <div className="mt-2.5 text-right">
                            <button
                              onClick={() => setSelectedEmail({ snippet: event.emailSnippet!, date: event.timestamp })}
                              className="text-xs font-semibold text-primary-700 hover:text-primary-900"
                            >
                              View full email
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1.5 text-sm leading-relaxed text-clinical-500">{event.detail}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {requiresIntervention && canAct ? (
          <div className="border-t border-clinical-200 bg-white px-7 py-5 shadow-lg space-y-3">
            <div className="flex items-start gap-2.5">
              <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-alert-600" />
              <div>
                <p className="text-sm font-semibold text-clinical-900">Manual resolution required</p>
                <p className="mt-1 text-xs text-clinical-500">
                  No further backups available. Reclassify the response, obtain the supplies
                  through another channel, or cancel this order.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenClassify(order)}
              className="w-full rounded-lg bg-primary-700 px-3 py-2.5 text-xs font-semibold text-white hover:bg-primary-800"
            >
              {isUnclear ? 'Classify response…' : 'Override classification…'}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { onReceiveDelivery(order); onClose(); }}
                className="flex-1 rounded-lg bg-success-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-success-700"
              >
                Confirm Received
              </button>
              <button
                onClick={() => { onCancelOrder(order.id); onClose(); }}
                className="flex-1 rounded-lg border border-alert-200 bg-alert-50 px-3 py-2.5 text-xs font-semibold text-alert-700 hover:bg-alert-100"
              >
                Cancel Order
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between border-t border-clinical-200 bg-white px-7 py-4">
            <p className="text-xs text-clinical-400">{events.length} logged events</p>
            <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-lg border border-clinical-200 bg-white px-3.5 py-2 text-xs font-semibold text-clinical-700 hover:bg-clinical-50">
              {exported ? <IconCheck className="h-4 w-4 text-success-600" /> : <IconDownload className="h-4 w-4" />}
              {exported ? 'Log exported' : 'Export log'}
            </button>
          </div>
        )}
        </aside>
      </Overlay>
      {selectedEmail && (
        <FullEmailModal
          order={order}
          snippet={selectedEmail.snippet}
          date={selectedEmail.date}
          onClose={() => setSelectedEmail(null)}
        />
      )}
    </>
  );
}

// ── Purchase Order preview drawer ─────────────────────────────

function PODrawer({ order, onClose }: { order: SupplyOrder; onClose: () => void }) {
  const { suppliers } = useClinic();
  const supplier = suppliers.find(s => s.id === order.supplierId);
  const subtotal = order.qty * order.unitCost;

  const handlePrint = () => window.print();

  return (
    <Overlay align="right" onClose={onClose}>
      <aside className="relative flex h-full min-h-screen w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-center gap-4 border-b border-clinical-200 px-6 py-5">
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-clinical-500 hover:bg-clinical-100">
            <IconX className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold text-clinical-900">Purchase Order Preview</p>
            <p className="mt-0.5 truncate text-xs text-clinical-500">{order.poRef} · {supplier?.name ?? order.supplierId}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div id="po-print-region" className="px-10 py-10 text-clinical-900">
            <div className="border-b-2 border-primary-700 pb-4 text-center">
              <p className="text-xl font-bold tracking-[0.2em] text-primary-700">PURCHASE ORDER</p>
              <p className="mt-1.5 text-sm font-semibold text-clinical-900">Premier Dental Solutions PH</p>
              <p className="mt-0.5 text-xs text-clinical-500">Makati Branch · procurement@premierdental.ph</p>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-8">
              <div>
                <p className="border-b border-clinical-200 pb-1 text-[11px] font-semibold uppercase tracking-wider text-clinical-500">
                  Order Details
                </p>
                <dl className="mt-2 space-y-1.5">
                  <PoRow label="PO Reference" value={order.poRef} />
                  <PoRow label="Order Date" value={order.createdAt} />
                  <PoRow label="Status" value={STATUS_LABELS[order.status]} />
                  {order.originalOrderId && <PoRow label="Rerouted From" value={order.originalOrderId} />}
                </dl>
              </div>
              <div>
                <p className="border-b border-clinical-200 pb-1 text-[11px] font-semibold uppercase tracking-wider text-clinical-500">
                  Supplier
                </p>
                <dl className="mt-2 space-y-1.5">
                  <PoRow label="Company" value={supplier?.name ?? order.supplierId} />
                  <PoRow label="Contact Person" value={supplier?.contactPerson ?? '—'} />
                  <PoRow label="Email" value={supplier?.email ?? '—'} />
                  <PoRow label="Phone" value={supplier?.phone ?? '—'} />
                  <PoRow label="Payment Terms" value={supplier?.paymentTerms ?? '—'} />
                  <PoRow label="Lead Time" value={supplier ? `${supplier.leadTimeDays} days` : '—'} />
                </dl>
              </div>
            </div>

            <table className="mt-8 w-full text-sm">
              <thead>
                <tr className="border-b-2 border-clinical-200">
                  <th className="py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-clinical-500">Item</th>
                  <th className="py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-clinical-500">SKU</th>
                  <th className="py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-clinical-500">Stock at Draft</th>
                  <th className="py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-clinical-500">Quantity</th>
                  <th className="py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-clinical-500">Unit Cost</th>
                  <th className="py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-clinical-500">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-clinical-100">
                  <td className="py-3 font-medium text-clinical-900">{order.itemName}</td>
                  <td className="py-3 font-mono text-xs text-clinical-600">{order.itemId}</td>
                  <td className="py-3 text-right text-clinical-700">{order.stockAtDraft} {order.unit}</td>
                  <td className="py-3 text-right text-clinical-700">{order.qty} {order.unit}</td>
                  <td className="py-3 text-right text-clinical-700">₱{order.unitCost.toLocaleString()}</td>
                  <td className="py-3 text-right font-medium text-clinical-900">₱{subtotal.toLocaleString()}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="border-t-2 border-primary-700 pt-4 text-right text-sm font-semibold text-clinical-700">
                    Total Amount
                  </td>
                  <td className="border-t-2 border-primary-700 pt-4 text-right text-base font-bold text-primary-700">
                    ₱{subtotal.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-12 border-t border-clinical-200 pt-4 text-center text-[11px] text-clinical-400">
              <p>Auto-generated by Premier Dental Solutions PH — Supply Ordering module.</p>
              <p className="mt-1">For inquiries, contact procurement@premierdental.ph.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-clinical-200 bg-white px-6 py-4 shadow-lg">
          <p className="text-[11px] text-clinical-500">
            Preview shown above. Print or save as PDF using your browser dialog.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-clinical-200 bg-white px-4 py-2 text-xs font-semibold text-clinical-700 hover:bg-clinical-50"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-800"
            >
              <IconPrinter className="h-4 w-4" /> Print / Save as PDF
            </button>
          </div>
        </div>
      </aside>
    </Overlay>
  );
}

function PoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-clinical-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-clinical-800">{value}</dd>
    </div>
  );
}

// ── Main OrderMonitoring component ───────────────────────────

interface OrderMonitoringProps {
  initialOrderId?: string | null;
  onConsumeInitialOrderId?: () => void;
}

export default function OrderMonitoring({
  initialOrderId,
  onConsumeInitialOrderId,
}: OrderMonitoringProps = {}) {
   const {
     orders,
     orderTimeline,
     inventory,
     suppliers,
     inventoryAlertLog,
     orderDispatchLog,
     confirmReceived,
     classifyResponse,
     cancelOrder,
   } = useClinic();

  const [filter, setFilter] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SupplyOrder | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [poOrder, setPoOrder] = useState<SupplyOrder | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<SupplyOrder | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  // Inline "Confirm Received" link is a one-click action placed next to
  // other row-level links. Holding the target here lets the first click
  // swap the link for a Confirm / Cancel pair so a same-cell misclick
  // (aiming for "View order timeline" and landing on Confirm) can be
  // undone without completing the order.
  const [pendingReceiveId, setPendingReceiveId] = useState<string | null>(null);
  const pageSize = 5;

  const consumedInitialOrderRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialOrderId) return;
    if (consumedInitialOrderRef.current === initialOrderId) return;
    const target = orders.find(o => o.id === initialOrderId);
    if (target) {
      setSelected(target);
      setTimelineOpen(true);
    }
    consumedInitialOrderRef.current = initialOrderId;
    onConsumeInitialOrderId?.();
  }, [initialOrderId, orders, onConsumeInitialOrderId]);

  const displayOrders: DisplayOrder[] = useMemo(() => orders.map(order => ({
    order,
    supplier: suppliers.find(s => s.id === order.supplierId),
    route: order.originalOrderId ? 'Backup · Auto-reroute' : 'Primary',
  })), [orders, suppliers]);

  const filtered = useMemo(() => displayOrders.filter(({ order, supplier }) => {
    const matchesTab =
      filter === 'all' ? true
      : filter === 'action' ? isActionRequired(order.status)
      : filter === 'pending' ? isPending(order.status)
      : order.status === 'completed';
    const searchable = `${order.poRef} ${supplier?.name ?? ''} ${order.itemName} ${order.itemId} ${order.status}`.toLowerCase();
    return matchesTab && searchable.includes(query.toLowerCase());
  }), [displayOrders, filter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [filter, query]);

  useEffect(() => {
    if (!menuId) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && !target.closest('[data-order-menu]')) {
        setMenuId(null);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [menuId]);

  const openTimeline = (order: SupplyOrder) => {
    setSelected(order);
    setTimelineOpen(true);
  };

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'action', label: 'Action Required', count: orders.filter(o => isActionRequired(o.status)).length },
    { id: 'all', label: 'All', count: orders.length },
    { id: 'pending', label: 'Pending', count: orders.filter(o => isPending(o.status)).length },
    { id: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length },
  ];

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="relative max-w-2xl flex-1">
          <IconSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-clinical-400" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search PO, supplier, item, status..." className="w-full rounded-full border border-clinical-200 bg-white py-3 pl-12 pr-4 text-sm text-clinical-800 shadow-sm outline-none transition placeholder:text-clinical-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
        </div>
      </div>

      <div className="mb-4 flex items-center gap-1 border-b border-clinical-200">
        {tabs.map(tab => {
          const active = filter === tab.id;
          const action = tab.id === 'action';
          return (
            <button key={tab.id} onClick={() => setFilter(tab.id)} className={`relative px-4 py-3 text-xs font-semibold transition ${active ? action ? 'text-alert-700' : 'text-primary-800' : action ? 'text-alert-600 hover:bg-alert-50' : 'text-clinical-500 hover:text-clinical-800'}`}>
              {tab.label} ({tab.count})
              {active && <span className={`absolute inset-x-2 bottom-0 h-0.5 ${action ? 'bg-alert-600' : 'bg-primary-700'}`} />}
            </button>
          );
        })}
      </div>

      <div className="overflow-visible rounded-xl border border-clinical-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] table-auto text-left text-sm">
            <thead>
              <tr className="border-b border-clinical-200 bg-clinical-50/80 text-[11px] font-semibold uppercase tracking-wider text-clinical-500">
                <th className="min-w-40 px-5 py-3.5">PO Details</th>
                <th className="min-w-48 px-4 py-3.5">Supplier</th>
                <th className="min-w-48 px-4 py-3.5">Order Status</th>
                <th className="min-w-48 px-4 py-3.5">Items Summary</th>
                <th className="min-w-72 px-4 py-3.5">System Action</th>
                <th className="sticky right-0 w-12 bg-clinical-50 px-3 py-3.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-clinical-100">
              {visible.map(({ order, supplier, route }) => {
                const item = inventory.find(i => i.id === order.itemId);
                const linkedAlert = inventoryAlertLog.find(a => a.linkedOrderId === order.id);
                const bouncedLog = orderDispatchLog.find(
                  l => l.orderId === order.id && l.deliveryStatus === 'bounced'
                );
                const canAct = !isTerminal(order.status);
                // Any non-terminal order can be reclassified. For `unclear`
                // orders this is the *first* classification (the doctor
                // decides what the ambiguous reply means); for others it's an
                // override of an already-classified response. Same modal,
                // different copy.
                const canOverride = canAct;
                const isUnclear = order.status === 'unclear';
                const canReceive = canReceiveDelivery(order.status);
                return (
                  <tr key={order.id} className="group transition hover:bg-clinical-50/60">
                    <td className="px-4 py-5 align-top">
                      <p className="text-sm font-semibold text-clinical-900">{order.poRef}</p>
                      <p className="mt-1.5 text-xs italic text-clinical-400">{order.createdAt}</p>
                    </td>
                    <td className="px-5 py-5 align-top">
                      <p className="text-sm font-semibold text-clinical-800">{supplier?.name ?? order.supplierId}</p>
                      <p className="mt-1.5 text-xs text-clinical-400">{route}</p>
                    </td>
                    <td className="px-4 py-5 align-top"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-5 align-top">
                      <p className="text-sm font-semibold text-clinical-800">{order.qty} {order.unit}</p>
                      <p className="mt-1.5 text-xs text-clinical-500">{order.itemName}</p>
                      {item && (
                        <p className="mt-1 text-xs text-clinical-400">
                          {item.quantity} {item.unit} usable · {item.id}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-5 align-top">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs leading-relaxed text-clinical-500">
                            {linkedAlert
                              ? `Triggered by ${linkedAlert.severity} alert at ${linkedAlert.qty} ${order.unit}`
                              : order.originalOrderId
                                ? 'Auto-rerouted from earlier supplier'
                                : 'Auto-drafted by stock watcher'}
                          </p>
		          {bouncedLog && (
                            <div className="mt-2 flex items-start gap-1.5 rounded-md border border-alert-200 bg-alert-50 px-2 py-1.5">
                              <IconAlert className="mt-0.5 h-3 w-3 shrink-0 text-alert-600" />
                              <p className="text-[10px] font-semibold text-alert-700">
                                Email bounce — {bouncedLog.recipientEmail}
                              </p>
                            </div>
                          )}
                          {order.status === 'sent' && (
                            <button onClick={() => openTimeline(order)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-900">
                              <IconClock className="h-3.5 w-3.5" /> View order timeline <IconChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {order.status === 'being_delivered' && (
                            pendingReceiveId === order.id ? (
                              <div className="mt-2 flex items-center gap-1.5">
                                <button
                                  onClick={() => { confirmReceived(order.id); setPendingReceiveId(null); }}
                                  className="inline-flex items-center gap-1 rounded-md border border-success-200 bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700 hover:bg-success-100"
                                >
                                  <IconCheck className="h-3.5 w-3.5" /> Confirm
                                </button>
                                <button
                                  onClick={() => setPendingReceiveId(null)}
                                  className="rounded-md px-2 py-1 text-xs font-medium text-clinical-500 hover:text-clinical-800"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setPendingReceiveId(order.id)}
                                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-900"
                              >
                                <IconPackage className="h-3.5 w-3.5" /> Confirm Received <IconChevronRight className="h-3.5 w-3.5" />
                              </button>
                            )
                          )}
                          {isActionRequired(order.status) && (
                            <button onClick={() => openTimeline(order)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-alert-700 hover:text-alert-600">
                              <IconAlert className="h-3.5 w-3.5" /> Resolve dead end <IconChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`sticky right-0 bg-white px-3 py-5 align-top transition group-hover:bg-clinical-50 ${menuId === order.id ? 'z-40' : 'z-10'}`}>
                      <div className="relative" data-order-menu>
                        <button onClick={() => setMenuId(menuId === order.id ? null : order.id)} aria-label={`Actions for ${order.poRef}`} className="rounded-lg p-1.5 text-clinical-400 hover:bg-clinical-100 hover:text-clinical-800"><IconMoreVertical className="h-5 w-5" /></button>
                        {menuId === order.id && (
                          <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-lg border border-clinical-200 bg-white py-1.5 shadow-xl">
                            <button onClick={() => { setPoOrder(order); setMenuId(null); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-clinical-700 hover:bg-clinical-50">
                              <IconPrinter className="h-4 w-4 shrink-0 text-clinical-500" /> Preview purchase order
                            </button>
                            <button onClick={() => { openTimeline(order); setMenuId(null); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-clinical-700 hover:bg-clinical-50">
                              <IconClock className="h-4 w-4 shrink-0 text-clinical-500" /> View audit trail
                            </button>

                            {/* Divider only when a consequential action follows */}
                            {(canOverride || canReceive) && (
                              <div className="my-1 border-t border-clinical-100" />
                            )}

                            {canOverride && (
                              <button onClick={() => { setOverrideTarget(order); setMenuId(null); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-clinical-700 hover:bg-clinical-50">
                                <IconExternalLink className="h-4 w-4 shrink-0 text-clinical-500" />
                                {isUnclear ? 'Classify response…' : 'Override classification…'}
                              </button>
                            )}
                            {canReceive && (
                              <button onClick={() => { confirmReceived(order.id); setMenuId(null); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-clinical-700 hover:bg-clinical-50">
                                <IconPackage className="h-4 w-4 shrink-0 text-clinical-500" /> Confirm Received
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-16 text-center"><IconSearch className="mx-auto h-6 w-6 text-clinical-300" /><p className="mt-3 text-sm font-medium text-clinical-700">No matching orders</p><p className="mt-1 text-xs text-clinical-400">Try another search or status.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-clinical-100 px-5 py-3 text-xs text-clinical-500">
          <span>{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length} orders</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page === 1} aria-label="Previous page" className="rounded p-1 text-clinical-500 transition hover:bg-clinical-100 hover:text-clinical-800 disabled:cursor-not-allowed disabled:text-clinical-300"><IconChevronRight className="h-4 w-4 rotate-180" /></button>
            <span>{page} of {totalPages}</span>
            <button onClick={() => setPage(value => Math.min(totalPages, value + 1))} disabled={page === totalPages} aria-label="Next page" className="rounded p-1 text-clinical-500 transition hover:bg-clinical-100 hover:text-clinical-800 disabled:cursor-not-allowed disabled:text-clinical-300"><IconChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {timelineOpen && selected && (
        <TimelineDrawer
          order={selected}
          timeline={orderTimeline.filter(e => e.orderId === selected.id).sort((a, b) => a.ts - b.ts)}
          onClose={() => { setTimelineOpen(false); setSelected(null); }}
          onCancelOrder={cancelOrder}
          onReceiveDelivery={(o) => confirmReceived(o.id)}
          onOpenClassify={(o) => {
            setOverrideTarget(o);
            setTimelineOpen(false);
            setSelected(null);
          }}
        />
      )}
      {poOrder && <PODrawer order={poOrder} onClose={() => setPoOrder(null)} />}
      {overrideTarget && (
        <OverrideClassificationModal
          order={overrideTarget}
          onClose={() => setOverrideTarget(null)}
          onApply={(cls, reason) => {
            classifyResponse(overrideTarget.id, cls, true, reason);
            setOverrideTarget(null);
          }}
        />
      )}
    </div>
  );
}
