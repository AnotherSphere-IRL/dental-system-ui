import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { PaymentMethod } from '../constants/paymentMethods';

// ── Types ──────────────────────────────────────────────────────

export interface InventoryBatch {
  batchNo: string;
  qty: number;
  expiry: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  supplierId: string;
  backupSupplierIds: string[];
  quantity: number;
  // Whether this item has ever carried real stock. Pre-configured records
  // (added via the Add Item drawer with qty 0) start false and stay silent
  // in the M18 threshold watcher until their first batch is registered —
  // otherwise the watcher would fire a phantom critical alert + auto-PO
  // for supplies the clinic has not actually received yet.
  everStocked: boolean;
  criticalThreshold: number;
  reorderThreshold: number;
  overstockThreshold: number;
  batches: InventoryBatch[];
}

export type StockStatus = 'critical' | 'low' | 'ok' | 'overstock';

export interface DeductionEntry {
  id: string;
  itemId: string;
  itemName: string;
  qty: number;
  patientId: string;
  procedure: string;
  performedBy: string;
  date: string;
}

export type OrderStatus =
  | 'queued'
  | 'sent'
  | 'confirmed'
  | 'being_delivered'
  | 'unavailable'
  | 'no_response'
  | 'unclear'
  | 'rerouted'
  | 'completed'
  | 'cancelled';

export type ResponseClass = 'confirmed' | 'unavailable' | 'no_response' | 'unclear';

export interface SupplyOrder {
  id: string;
  poRef: string;
  itemId: string;
  itemName: string;
  qty: number;
  // Stock level when the order was auto-drafted — surfaced on the PO per
  // process doc §4 Activity #4 ("item, current stock, suggested quantity,
  // primary supplier, and backup chain").
  stockAtDraft: number;
  unit: string;
  supplierId: string;
  status: OrderStatus;
  supplierResponse?: string;
  responseClass?: ResponseClass;
  linkedOrderId?: string;
  originalOrderId?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  receivedAt?: string;
  unitCost: number;
  queuedAtMs?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  products: string[];
  leadTimeDays: number;
  responseWindowHours: number;
  paymentTerms: string;
  status: 'active' | 'inactive' | 'backup';
  responseRate: number;
  avgResponseTimeHrs: number;
  rerouteFrequency: number;
}

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'for_verification';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type RefundStatus = 'pending' | 'approved' | 'awaiting_cash' | 'processing' | 'refunded' | 'rejected' | 'failed';

export interface PaymentTransaction {
  id: string;
  reference: string;
  patient: string;
  patientId: string;
  appointmentId: string;
  service: string;
  amountDue: number;
  amountPaid: number;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
  paymentDate?: string;
  proofFile?: string;
  receiptRef?: string;
}

export interface FinancialAuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  reference: string;
  amount: number;
}

export interface CancellationRequest {
  id: string;
  patient: string;
  patientId: string;
  appointmentId: string;
  service: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  paymentReference?: string;
  paymentStatus: PaymentStatus;
  status: RequestStatus;
  rejectionReason?: string;
}

export interface RefundRequest {
  id: string;
  patient: string;
  patientId: string;
  transactionRef: string;
  service: string;
  amountPaid: number;
  requestedAmount: number;
  method: PaymentMethod;
  paymentDate: string;
  reason: string;
  supportingDocument?: string;
  status: RefundStatus;
  rejectionReason?: string;
  refundReference?: string;
}

export interface FeeCorrection {
  id: string;
  transactionRef: string;
  patient: string;
  patientId: string;
  service: string;
  originalFee: number;
  correctedFee: number;
  difference: number;
  reason: string;
  status: 'approved';
  createdAt: string;
}

export type ExpenseCategory = 'Supplies' | 'Utilities' | 'Equipment' | 'Maintenance' | 'Other';

export interface ExpenseRecord {
  id: string;
  merchant: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  receiptNumber?: string;
  receiptFile?: string;
  createdBy: string;
  createdAt: string;
}

// ── M18 / M20 / M22 additions ─────────────────────────────

export interface InventoryAlertLog {
  id: string;
  itemId: string;
  itemName: string;
  severity: 'critical' | 'low' | 'overstock';
  qty: number;
  threshold: number;
  triggeredAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: 'system' | 'doctor';
  linkedOrderId?: string;
  linkedNoteId?: string;
  expiryRisk?: {
    expiringQty: number;
    expiredQty: number;
    earliestExpiryDays: number | null;
  };
}

export interface OverstockReviewNote {
  id: string;
  itemId: string;
  itemName: string;
  qty: number;
  overstockThreshold: number;
  reviewNote: string;
  createdAt: string;
  status: 'open' | 'resolved';
  linkedAlertId?: string;
}

export type InventoryAuditAction =
  | 'alert-fired'
  | 'alert-acknowledged'
  | 'alert-auto-resolved'
  | 'overstock-note-resolved'
  | 'item-created'
  | 'item-updated'
  | 'batch-discarded';

export interface InventoryAuditEntry {
  id: string;
  ts: number;
  timestamp: string;
  actor: 'system' | 'doctor';
  action: InventoryAuditAction;
  itemId: string;
  itemName: string;
  detail: string;
}

export interface OrderDispatchLog {
  id: string;
  orderId: string;
  poRef: string;
  recipientEmail: string;
  recipientName: string;
  messageId: string;
  dispatchedAt: string;
  deliveryStatus: 'sent' | 'bounced';
}

export type OrderTimelineKind =
  | 'created'
  | 'dispatched'
  | 'reply-parsed'
  | 'classified'
  | 'reclassified'
  | 'rerouted'
  | 'timeout'
  | 'escalated'
  | 'received'
  | 'cancelled';

export interface OrderTimelineEvent {
  id: string;
  orderId: string;
  ts: number;
  timestamp: string;
  kind: OrderTimelineKind;
  actor: 'system' | 'doctor' | 'supplier';
  title: string;
  detail: string;
  emailSnippet?: {
    sender: string;
    before: string;
    keyword: string;
    after: string;
  };
}

export interface AutomationConfig {
  eodDispatchHour: number;
  criticalImmediate: boolean;
  responseWindowHours: number;
  rerouteChainLimit: number;
}

export type DemoTrigger =
  | 'force-eod-dispatch'
  | 'simulate-reply-confirmed'
  | 'simulate-reply-unavailable'
  | 'simulate-no-response'
  | 'simulate-email-bounce';

const SEVERITY_RANK: Record<'critical' | 'low' | 'overstock', number> = {
  critical: 3,
  low: 2,
  overstock: 1,
};

const MAX_AUDIT_ENTRIES = 500;

// ── Seed Data ─────────────────────────────────────────────────

const SEED_SUPPLIERS: Supplier[] = [
  { id: 'S01', name: 'GC Dental Supply Co.', contactPerson: 'Maria Santos', phone: '+63 917 555 0101', email: 'orders@gcdental.ph', address: '14 Dental Ave, Makati City', products: ['I01','I02','I03','I09','I10','I14'], leadTimeDays: 2, responseWindowHours: 24, paymentTerms: 'Net 30', status: 'active', responseRate: 92, avgResponseTimeHrs: 8, rerouteFrequency: 1 },
  { id: 'S02', name: 'MedDent Philippines', contactPerson: 'Juan Cruz', phone: '+63 918 555 0202', email: 'supply@meddent.ph', address: '7 Medic Blvd, Quezon City', products: ['I04','I05','I13'], leadTimeDays: 3, responseWindowHours: 24, paymentTerms: 'Net 15', status: 'active', responseRate: 88, avgResponseTimeHrs: 12, rerouteFrequency: 2 },
  { id: 'S03', name: 'UniMed Supplies', contactPerson: 'Rosa Dela Torre', phone: '+63 916 555 0303', email: 'info@unimed.ph', address: '22 Health Plaza, Pasig City', products: ['I06','I07','I08','I11'], leadTimeDays: 1, responseWindowHours: 12, paymentTerms: 'COD', status: 'active', responseRate: 97, avgResponseTimeHrs: 5, rerouteFrequency: 0 },
  { id: 'S04', name: 'DentaCore Backup PH', contactPerson: 'Leo Bautista', phone: '+63 919 555 0404', email: 'backup@dentacore.ph', address: '5 Supply St, Taguig City', products: ['I01','I02','I03','I04','I05','I12'], leadTimeDays: 3, responseWindowHours: 24, paymentTerms: 'Net 30', status: 'backup', responseRate: 85, avgResponseTimeHrs: 18, rerouteFrequency: 0 },
  { id: 'S05', name: 'ProDental Warehouse', contactPerson: 'Claire Sy', phone: '+63 920 555 0505', email: 'orders@prodental.ph', address: '100 Commerce Rd, Mandaluyong', products: ['I06','I07','I08','I09','I10','I11'], leadTimeDays: 2, responseWindowHours: 12, paymentTerms: 'Net 15', status: 'backup', responseRate: 90, avgResponseTimeHrs: 10, rerouteFrequency: 0 },
  { id: 'S06', name: 'Pacific Dental Traders', contactPerson: 'Hector Villamor', phone: '+63 921 555 0606', email: 'sales@pacificdental.ph', address: '9 Trade Center, Pasay City', products: ['I12'], leadTimeDays: 4, responseWindowHours: 24, paymentTerms: 'Net 30', status: 'backup', responseRate: 82, avgResponseTimeHrs: 20, rerouteFrequency: 0 },
];

const today = new Date();
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10);
const subtractDays = (d: Date, n: number) => addDays(d, -n);

const SEED_INVENTORY: InventoryItem[] = [
  { id: 'I01', name: 'Composite Resin A2', category: 'Restorative', unit: 'syringe', unitCost: 420, supplierId: 'S01', backupSupplierIds: ['S04'], quantity: 3, everStocked: true, criticalThreshold: 2, reorderThreshold: 5, overstockThreshold: 20, batches: [{ batchNo: 'B2026-01A', qty: 3, expiry: addDays(today, 25) }] },
  { id: 'I02', name: 'Composite Resin A3', category: 'Restorative', unit: 'syringe', unitCost: 420, supplierId: 'S01', backupSupplierIds: ['S04'], quantity: 8, everStocked: true, criticalThreshold: 2, reorderThreshold: 5, overstockThreshold: 20, batches: [{ batchNo: 'B2026-02A', qty: 8, expiry: addDays(today, 180) }] },
  { id: 'I03', name: 'Bonding Agent', category: 'Restorative', unit: 'bottle', unitCost: 750, supplierId: 'S01', backupSupplierIds: ['S04'], quantity: 0, everStocked: true, criticalThreshold: 1, reorderThreshold: 2, overstockThreshold: 8, batches: [] },
  { id: 'I04', name: 'Anesthetic Carpule 2%', category: 'Anesthetics', unit: 'carpule', unitCost: 65, supplierId: 'S02', backupSupplierIds: ['S04'], quantity: 24, everStocked: true, criticalThreshold: 10, reorderThreshold: 20, overstockThreshold: 100, batches: [{ batchNo: 'B2026-04A', qty: 10, expiry: addDays(today, 45) }, { batchNo: 'B2026-04B', qty: 14, expiry: addDays(today, 240) }] },
  { id: 'I05', name: 'Dental Cement', category: 'Restorative', unit: 'pack', unitCost: 380, supplierId: 'S02', backupSupplierIds: ['S04'], quantity: 2, everStocked: true, criticalThreshold: 2, reorderThreshold: 3, overstockThreshold: 12, batches: [{ batchNo: 'B2026-05A', qty: 2, expiry: addDays(today, 320) }] },
  { id: 'I06', name: 'Rubber Dam (pack)', category: 'Isolation', unit: 'pack', unitCost: 290, supplierId: 'S03', backupSupplierIds: ['S05'], quantity: 1, everStocked: true, criticalThreshold: 1, reorderThreshold: 3, overstockThreshold: 10, batches: [{ batchNo: 'B2026-06A', qty: 1, expiry: addDays(today, 730) }] },
  { id: 'I07', name: 'Matrix Band', category: 'Isolation', unit: 'pack', unitCost: 155, supplierId: 'S03', backupSupplierIds: ['S05'], quantity: 18, everStocked: true, criticalThreshold: 5, reorderThreshold: 10, overstockThreshold: 50, batches: [{ batchNo: 'B2026-07A', qty: 18, expiry: addDays(today, 500) }] },
  { id: 'I08', name: 'Gloves (pair)', category: 'Consumables', unit: 'pair', unitCost: 8, supplierId: 'S03', backupSupplierIds: ['S05'], quantity: 150, everStocked: true, criticalThreshold: 20, reorderThreshold: 50, overstockThreshold: 300, batches: [{ batchNo: 'B2026-08A', qty: 150, expiry: addDays(today, 400) }] },
  { id: 'I09', name: 'Cotton Rolls', category: 'Consumables', unit: 'roll', unitCost: 3, supplierId: 'S01', backupSupplierIds: ['S05'], quantity: 20, everStocked: true, criticalThreshold: 10, reorderThreshold: 30, overstockThreshold: 150, batches: [{ batchNo: 'B2026-09A', qty: 20, expiry: addDays(today, 600) }] },
  { id: 'I10', name: 'Gauze Pads', category: 'Consumables', unit: 'pad', unitCost: 4, supplierId: 'S01', backupSupplierIds: ['S05'], quantity: 5, everStocked: true, criticalThreshold: 15, reorderThreshold: 40, overstockThreshold: 200, batches: [{ batchNo: 'B2026-10A', qty: 5, expiry: addDays(today, 550) }] },
  // I11 — Overstock scenario: current qty above overstockMax, so M18 fires an
  // overstock alert and suppresses ordering. Demonstrates the third severity.
  { id: 'I11', name: 'Disposable Bibs', category: 'Consumables', unit: 'piece', unitCost: 12, supplierId: 'S03', backupSupplierIds: ['S05'], quantity: 250, everStocked: true, criticalThreshold: 20, reorderThreshold: 100, overstockThreshold: 200, batches: [{ batchNo: 'B2026-11A', qty: 250, expiry: addDays(today, 900) }] },
  // I12 — Expired batch scenario: qty is healthy, but one batch is past
  // expiry. M18 does not fire (quantity is fine), but the Dashboard expiry
  // block surfaces it directly, and the batch drawer offers discard.
  { id: 'I12', name: 'Fluoride Varnish', category: 'Preventive', unit: 'tube', unitCost: 180, supplierId: 'S04', backupSupplierIds: ['S06'], quantity: 8, everStocked: true, criticalThreshold: 3, reorderThreshold: 6, overstockThreshold: 30, batches: [{ batchNo: 'B2026-12A', qty: 2, expiry: subtractDays(today, 2) }, { batchNo: 'B2026-12B', qty: 6, expiry: addDays(today, 120) }] },
  // I13 — Expiring-soon scenario: batch falls inside the 30-day window.
  { id: 'I13', name: 'Suture Material 3-0', category: 'Surgical', unit: 'vial', unitCost: 240, supplierId: 'S02', backupSupplierIds: ['S04'], quantity: 5, everStocked: true, criticalThreshold: 2, reorderThreshold: 4, overstockThreshold: 20, batches: [{ batchNo: 'B2026-13A', qty: 5, expiry: addDays(today, 20) }] },
  // I14 — Feeds an auto-drafted being-delivered order so the exception queue
  // shows the "Confirm Received" info state out of the box.
  { id: 'I14', name: 'Composite Resin B1', category: 'Restorative', unit: 'syringe', unitCost: 420, supplierId: 'S01', backupSupplierIds: ['S04'], quantity: 4, everStocked: true, criticalThreshold: 2, reorderThreshold: 5, overstockThreshold: 20, batches: [{ batchNo: 'B2026-14A', qty: 4, expiry: addDays(today, 150) }] },
];

const SEED_ORDERS: SupplyOrder[] = [
  { id: 'ORD-001', poRef: 'PO-2026-041', itemId: 'I01', itemName: 'Composite Resin A2', qty: 10, stockAtDraft: 3, unit: 'syringe', supplierId: 'S01', unitCost: 420, status: 'being_delivered', supplierResponse: 'Confirmed. Order received. We will process this.', responseClass: 'confirmed', createdAt: subtractDays(today, 2), updatedAt: subtractDays(today, 1), confirmedAt: subtractDays(today, 1) },
  { id: 'ORD-002', poRef: 'PO-2026-042', itemId: 'I03', itemName: 'Bonding Agent', qty: 4, stockAtDraft: 0, unit: 'bottle', supplierId: 'S01', unitCost: 750, status: 'unclear', supplierResponse: 'Hi, do you need the 5ml or 7ml version? We have both in stock.', responseClass: 'unclear', createdAt: subtractDays(today, 1), updatedAt: subtractDays(today, 0) },
  { id: 'ORD-003', poRef: 'PO-2026-043', itemId: 'I05', itemName: 'Dental Cement', qty: 6, stockAtDraft: 2, unit: 'pack', supplierId: 'S02', unitCost: 380, status: 'rerouted', supplierResponse: 'Out of stock. Cannot fulfill.', responseClass: 'unavailable', linkedOrderId: 'ORD-004', createdAt: subtractDays(today, 3), updatedAt: subtractDays(today, 2) },
  { id: 'ORD-004', poRef: 'PO-2026-043R1', itemId: 'I05', itemName: 'Dental Cement', qty: 6, stockAtDraft: 2, unit: 'pack', supplierId: 'S04', unitCost: 390, status: 'sent', originalOrderId: 'ORD-003', createdAt: subtractDays(today, 2), updatedAt: subtractDays(today, 2) },
  { id: 'ORD-005', poRef: 'PO-2026-044', itemId: 'I06', itemName: 'Rubber Dam (pack)', qty: 5, stockAtDraft: 1, unit: 'pack', supplierId: 'S03', unitCost: 290, status: 'queued', createdAt: subtractDays(today, 0), updatedAt: subtractDays(today, 0) },
  { id: 'ORD-006', poRef: 'PO-2026-040', itemId: 'I02', itemName: 'Composite Resin A3', qty: 8, stockAtDraft: 4, unit: 'syringe', supplierId: 'S01', unitCost: 420, status: 'completed', supplierResponse: 'Noted po. Will deliver tomorrow.', responseClass: 'confirmed', createdAt: subtractDays(today, 7), updatedAt: subtractDays(today, 5), confirmedAt: subtractDays(today, 6), receivedAt: subtractDays(today, 5) },
  // ORD-007 — second being-delivered order so the doctor sees two
  // "Confirm Received" entries in the queue out of the box.
  { id: 'ORD-007', poRef: 'PO-2026-045', itemId: 'I14', itemName: 'Composite Resin B1', qty: 8, stockAtDraft: 4, unit: 'syringe', supplierId: 'S01', unitCost: 420, status: 'being_delivered', supplierResponse: 'Confirmed — shipping today.', responseClass: 'confirmed', createdAt: subtractDays(today, 1), updatedAt: subtractDays(today, 0), confirmedAt: subtractDays(today, 0) },
  // ORD-008 → ORD-009 — a rerouted pair. The parent shows up in the
  // Dashboard exception queue (info severity) so the doctor can trace the
  // chain without opening Orders.
  { id: 'ORD-008', poRef: 'PO-2026-046', itemId: 'I12', itemName: 'Fluoride Varnish', qty: 10, stockAtDraft: 3, unit: 'tube', supplierId: 'S04', unitCost: 180, status: 'rerouted', supplierResponse: 'Out of stock. Cannot fulfill.', responseClass: 'unavailable', linkedOrderId: 'ORD-009', createdAt: subtractDays(today, 4), updatedAt: subtractDays(today, 3) },
  { id: 'ORD-009', poRef: 'PO-2026-046R1', itemId: 'I12', itemName: 'Fluoride Varnish', qty: 10, stockAtDraft: 3, unit: 'tube', supplierId: 'S06', unitCost: 185, status: 'sent', originalOrderId: 'ORD-008', createdAt: subtractDays(today, 3), updatedAt: subtractDays(today, 3) },
  // ORD-010 — a completed order for a third item, so Completed history in
  // Order Monitoring has more than one entry.
  { id: 'ORD-010', poRef: 'PO-2026-038', itemId: 'I07', itemName: 'Matrix Band', qty: 12, stockAtDraft: 8, unit: 'pack', supplierId: 'S03', unitCost: 155, status: 'completed', supplierResponse: 'Confirmed. Dispatching now.', responseClass: 'confirmed', createdAt: subtractDays(today, 12), updatedAt: subtractDays(today, 10), confirmedAt: subtractDays(today, 11), receivedAt: subtractDays(today, 10) },
];

const msAgo = (days: number, hours = 0) => Date.now() - days * 86400000 - hours * 3600000;
const fmtTs = (ms: number) =>
  new Date(ms).toLocaleString('en-PH', { hour12: false }).slice(0, 16);

const SEED_ORDER_TIMELINE: OrderTimelineEvent[] = [
  { id: 'TL-001-a', orderId: 'ORD-001', ts: msAgo(2, 4), timestamp: fmtTs(msAgo(2, 4)),
    kind: 'created', actor: 'system', title: 'Auto-drafted critical order',
    detail: 'Stock at 3 syringe (threshold 2). Drafted PO for 10 syringe.' },
  { id: 'TL-001-b', orderId: 'ORD-001', ts: msAgo(2, 3), timestamp: fmtTs(msAgo(2, 3)),
    kind: 'dispatched', actor: 'system', title: 'PO dispatched via SMTP email (simulated)',
    detail: 'PDF PO emailed to GC Dental Supply Co. (orders@gcdental.ph). Awaiting response.' },
  { id: 'TL-001-c', orderId: 'ORD-001', ts: msAgo(1, 2), timestamp: fmtTs(msAgo(1, 2)),
    kind: 'reply-parsed', actor: 'supplier', title: 'System parsed email (Keyword Match - confirmed)',
    detail: 'Matched keyword in supplier reply from GC Dental Supply Co.',
    emailSnippet: { sender: 'orders@gcdental.ph', before: '', keyword: 'Confirmed', after: '. Order received. We will process this.' } },
  { id: 'TL-001-d', orderId: 'ORD-001', ts: msAgo(1, 1), timestamp: fmtTs(msAgo(1, 1)),
    kind: 'classified', actor: 'system', title: 'Status - Being Delivered',
    detail: 'Awaiting physical arrival. Doctor will confirm receipt.' },

  { id: 'TL-002-a', orderId: 'ORD-002', ts: msAgo(1, 6), timestamp: fmtTs(msAgo(1, 6)),
    kind: 'created', actor: 'system', title: 'Auto-drafted critical order',
    detail: 'Stock at 0 bottle (threshold 1). Drafted PO for 4 bottle.' },
  { id: 'TL-002-b', orderId: 'ORD-002', ts: msAgo(1, 5), timestamp: fmtTs(msAgo(1, 5)),
    kind: 'dispatched', actor: 'system', title: 'PO dispatched via SMTP email (simulated)',
    detail: 'PDF PO emailed to GC Dental Supply Co. (orders@gcdental.ph). Awaiting response.' },
  { id: 'TL-002-c', orderId: 'ORD-002', ts: msAgo(0, 3), timestamp: fmtTs(msAgo(0, 3)),
    kind: 'reply-parsed', actor: 'supplier', title: 'System parsed email (Unclear)',
    detail: 'No matching keyword. Routed to doctor for classification.',
    emailSnippet: { sender: 'orders@gcdental.ph', before: 'Hi, do you need the 5ml or 7ml version? We have both in ', keyword: 'stock', after: '.' } },

  { id: 'TL-003-a', orderId: 'ORD-003', ts: msAgo(3, 5), timestamp: fmtTs(msAgo(3, 5)),
    kind: 'created', actor: 'system', title: 'Auto-drafted low order',
    detail: 'Stock at 2 pack (threshold 3). Drafted PO for 6 pack.' },
  { id: 'TL-003-b', orderId: 'ORD-003', ts: msAgo(3, 4), timestamp: fmtTs(msAgo(3, 4)),
    kind: 'dispatched', actor: 'system', title: 'PO dispatched via SMTP email (simulated)',
    detail: 'PDF PO emailed to MedDent Philippines (supply@meddent.ph). Awaiting response.' },
  { id: 'TL-003-c', orderId: 'ORD-003', ts: msAgo(2, 8), timestamp: fmtTs(msAgo(2, 8)),
    kind: 'reply-parsed', actor: 'supplier', title: 'System parsed email (Keyword Match - unavailable)',
    detail: 'Matched keyword in supplier reply from MedDent Philippines.',
    emailSnippet: { sender: 'supply@meddent.ph', before: '', keyword: 'Out of stock', after: '. Cannot fulfill.' } },
  { id: 'TL-003-d', orderId: 'ORD-003', ts: msAgo(2, 7), timestamp: fmtTs(msAgo(2, 7)),
    kind: 'rerouted', actor: 'system', title: 'Rerouted to backup supplier',
    detail: 'Supplier unavailable - auto-rerouted to DentaCore Backup PH.' },

  { id: 'TL-004-a', orderId: 'ORD-004', ts: msAgo(2, 7), timestamp: fmtTs(msAgo(2, 7)),
    kind: 'created', actor: 'system', title: 'Backup order created',
    detail: 'Rerouted from PO-2026-043. Queued for dispatch.' },
  { id: 'TL-004-b', orderId: 'ORD-004', ts: msAgo(2, 6), timestamp: fmtTs(msAgo(2, 6)),
    kind: 'dispatched', actor: 'system', title: 'PO dispatched via SMTP email (simulated)',
    detail: 'PDF PO emailed to DentaCore Backup PH (backup@dentacore.ph). Awaiting response.' },

  { id: 'TL-005-a', orderId: 'ORD-005', ts: msAgo(0, 2), timestamp: fmtTs(msAgo(0, 2)),
    kind: 'created', actor: 'system', title: 'Auto-drafted low order',
    detail: 'Stock at 1 pack (threshold 3). Drafted PO for 5 pack.' },

  { id: 'TL-006-a', orderId: 'ORD-006', ts: msAgo(7, 4), timestamp: fmtTs(msAgo(7, 4)),
    kind: 'created', actor: 'system', title: 'Auto-drafted low order',
    detail: 'Stock at 4 syringe (threshold 5). Drafted PO for 8 syringe.' },
  { id: 'TL-006-b', orderId: 'ORD-006', ts: msAgo(7, 3), timestamp: fmtTs(msAgo(7, 3)),
    kind: 'dispatched', actor: 'system', title: 'PO dispatched via SMTP email (simulated)',
    detail: 'PDF PO emailed to GC Dental Supply Co. (orders@gcdental.ph). Awaiting response.' },
  { id: 'TL-006-c', orderId: 'ORD-006', ts: msAgo(6, 5), timestamp: fmtTs(msAgo(6, 5)),
    kind: 'reply-parsed', actor: 'supplier', title: 'System parsed email (Keyword Match - confirmed)',
    detail: 'Matched keyword in supplier reply from GC Dental Supply Co.',
    emailSnippet: { sender: 'orders@gcdental.ph', before: '', keyword: 'Noted po', after: '. Will deliver tomorrow.' } },
  { id: 'TL-006-d', orderId: 'ORD-006', ts: msAgo(6, 4), timestamp: fmtTs(msAgo(6, 4)),
    kind: 'classified', actor: 'system', title: 'Status - Being Delivered',
    detail: 'Awaiting physical arrival. Doctor will confirm receipt.' },
  { id: 'TL-006-e', orderId: 'ORD-006', ts: msAgo(5, 3), timestamp: fmtTs(msAgo(5, 3)),
    kind: 'received', actor: 'doctor', title: 'Physical receipt confirmed',
    detail: '8 units added to inventory. Order completed.' },

  { id: 'TL-007-a', orderId: 'ORD-007', ts: msAgo(1, 5), timestamp: fmtTs(msAgo(1, 5)),
    kind: 'created', actor: 'system', title: 'Auto-drafted low order',
    detail: 'Stock at 4 syringe (threshold 5). Drafted PO for 8 syringe.' },
  { id: 'TL-007-b', orderId: 'ORD-007', ts: msAgo(1, 4), timestamp: fmtTs(msAgo(1, 4)),
    kind: 'dispatched', actor: 'system', title: 'PO dispatched via SMTP email (simulated)',
    detail: 'PDF PO emailed to GC Dental Supply Co. (orders@gcdental.ph). Awaiting response.' },
  { id: 'TL-007-c', orderId: 'ORD-007', ts: msAgo(0, 2), timestamp: fmtTs(msAgo(0, 2)),
    kind: 'reply-parsed', actor: 'supplier', title: 'System parsed email (Keyword Match - confirmed)',
    detail: 'Matched keyword in supplier reply from GC Dental Supply Co.',
    emailSnippet: { sender: 'orders@gcdental.ph', before: '', keyword: 'Confirmed', after: ' — shipping today.' } },
  { id: 'TL-007-d', orderId: 'ORD-007', ts: msAgo(0, 1), timestamp: fmtTs(msAgo(0, 1)),
    kind: 'classified', actor: 'system', title: 'Status - Being Delivered',
    detail: 'Awaiting physical arrival. Doctor will confirm receipt.' },

  { id: 'TL-008-a', orderId: 'ORD-008', ts: msAgo(4, 5), timestamp: fmtTs(msAgo(4, 5)),
    kind: 'created', actor: 'system', title: 'Auto-drafted low order',
    detail: 'Stock at 3 tube (threshold 6). Drafted PO for 10 tube.' },
  { id: 'TL-008-b', orderId: 'ORD-008', ts: msAgo(4, 4), timestamp: fmtTs(msAgo(4, 4)),
    kind: 'dispatched', actor: 'system', title: 'PO dispatched via SMTP email (simulated)',
    detail: 'PDF PO emailed to DentaCore Backup PH (backup@dentacore.ph). Awaiting response.' },
  { id: 'TL-008-c', orderId: 'ORD-008', ts: msAgo(3, 6), timestamp: fmtTs(msAgo(3, 6)),
    kind: 'reply-parsed', actor: 'supplier', title: 'System parsed email (Keyword Match - unavailable)',
    detail: 'Matched keyword in supplier reply from DentaCore Backup PH.',
    emailSnippet: { sender: 'backup@dentacore.ph', before: '', keyword: 'Out of stock', after: '. Cannot fulfill.' } },
  { id: 'TL-008-d', orderId: 'ORD-008', ts: msAgo(3, 5), timestamp: fmtTs(msAgo(3, 5)),
    kind: 'rerouted', actor: 'system', title: 'Rerouted to backup supplier',
    detail: 'Supplier unavailable - auto-rerouted to Pacific Dental Traders.' },

  { id: 'TL-009-a', orderId: 'ORD-009', ts: msAgo(3, 5), timestamp: fmtTs(msAgo(3, 5)),
    kind: 'created', actor: 'system', title: 'Backup order created',
    detail: 'Rerouted from PO-2026-046. Queued for dispatch.' },
  { id: 'TL-009-b', orderId: 'ORD-009', ts: msAgo(3, 4), timestamp: fmtTs(msAgo(3, 4)),
    kind: 'dispatched', actor: 'system', title: 'PO dispatched via SMTP email (simulated)',
    detail: 'PDF PO emailed to Pacific Dental Traders (sales@pacificdental.ph). Awaiting response.' },

  { id: 'TL-010-a', orderId: 'ORD-010', ts: msAgo(12, 4), timestamp: fmtTs(msAgo(12, 4)),
    kind: 'created', actor: 'system', title: 'Auto-drafted low order',
    detail: 'Stock at 8 pack (threshold 10). Drafted PO for 12 pack.' },
  { id: 'TL-010-b', orderId: 'ORD-010', ts: msAgo(12, 3), timestamp: fmtTs(msAgo(12, 3)),
    kind: 'dispatched', actor: 'system', title: 'PO dispatched via SMTP email (simulated)',
    detail: 'PDF PO emailed to UniMed Supplies (info@unimed.ph). Awaiting response.' },
  { id: 'TL-010-c', orderId: 'ORD-010', ts: msAgo(11, 5), timestamp: fmtTs(msAgo(11, 5)),
    kind: 'reply-parsed', actor: 'supplier', title: 'System parsed email (Keyword Match - confirmed)',
    detail: 'Matched keyword in supplier reply from UniMed Supplies.',
    emailSnippet: { sender: 'info@unimed.ph', before: '', keyword: 'Confirmed', after: '. Dispatching now.' } },
  { id: 'TL-010-d', orderId: 'ORD-010', ts: msAgo(11, 4), timestamp: fmtTs(msAgo(11, 4)),
    kind: 'classified', actor: 'system', title: 'Status - Being Delivered',
    detail: 'Awaiting physical arrival. Doctor will confirm receipt.' },
  { id: 'TL-010-e', orderId: 'ORD-010', ts: msAgo(10, 3), timestamp: fmtTs(msAgo(10, 3)),
    kind: 'received', actor: 'doctor', title: 'Physical receipt confirmed',
    detail: '12 units added to inventory. Order completed.' },
];

const SEED_DEDUCTIONS: DeductionEntry[] = [
  { id: 'D001', itemId: 'I01', itemName: 'Composite Resin A2', qty: 1, patientId: 'P-1042', procedure: 'Composite Restoration', performedBy: 'Dr. Reyes', date: subtractDays(today, 1) },
  { id: 'D002', itemId: 'I04', itemName: 'Anesthetic Carpule 2%', qty: 2, patientId: 'P-1042', procedure: 'Root Canal Treatment', performedBy: 'Dr. Reyes', date: subtractDays(today, 1) },
  { id: 'D003', itemId: 'I08', itemName: 'Gloves (pair)', qty: 3, patientId: 'P-2031', procedure: 'Dental Examination', performedBy: 'Dr. Reyes', date: subtractDays(today, 2) },
  { id: 'D004', itemId: 'I09', itemName: 'Cotton Rolls', qty: 5, patientId: 'P-2031', procedure: 'Extraction', performedBy: 'Dr. Reyes', date: subtractDays(today, 2) },
  { id: 'D005', itemId: 'I10', itemName: 'Gauze Pads', qty: 2, patientId: 'P-1184', procedure: 'Scaling and Polishing', performedBy: 'Dr. Santos', date: subtractDays(today, 2) },
  { id: 'D006', itemId: 'I10', itemName: 'Gauze Pads', qty: 1, patientId: 'P-2097', procedure: 'Simple Extraction', performedBy: 'Dr. Reyes', date: subtractDays(today, 5) },
  { id: 'D007', itemId: 'I10', itemName: 'Gauze Pads', qty: 3, patientId: 'P-1452', procedure: 'Periodontal Treatment', performedBy: 'Dr. Santos', date: subtractDays(today, 9) },
  { id: 'D008', itemId: 'I10', itemName: 'Gauze Pads', qty: 1, patientId: 'P-1811', procedure: 'Pediatric Restoration', performedBy: 'Dr. Reyes', date: subtractDays(today, 13) },
  { id: 'D009', itemId: 'I10', itemName: 'Gauze Pads', qty: 2, patientId: 'P-2204', procedure: 'Deep Cleaning', performedBy: 'Dr. Santos', date: subtractDays(today, 18) },
  { id: 'D010', itemId: 'I10', itemName: 'Gauze Pads', qty: 1, patientId: 'P-1763', procedure: 'Crown Preparation', performedBy: 'Dr. Reyes', date: subtractDays(today, 24) },
  { id: 'D011', itemId: 'I03', itemName: 'Bonding Agent', qty: 1, patientId: 'P-1042', procedure: 'Composite Restoration', performedBy: 'Dr. Reyes', date: subtractDays(today, 3) },
  { id: 'D012', itemId: 'I03', itemName: 'Bonding Agent', qty: 2, patientId: 'P-1930', procedure: 'Anterior Restoration', performedBy: 'Dr. Santos', date: subtractDays(today, 8) },
  { id: 'D013', itemId: 'I03', itemName: 'Bonding Agent', qty: 1, patientId: 'P-1715', procedure: 'Cervical Restoration', performedBy: 'Dr. Reyes', date: subtractDays(today, 16) },
  { id: 'D014', itemId: 'I05', itemName: 'Dental Cement', qty: 1, patientId: 'P-1559', procedure: 'Crown Cementation', performedBy: 'Dr. Santos', date: subtractDays(today, 4) },
  { id: 'D015', itemId: 'I06', itemName: 'Rubber Dam (pack)', qty: 1, patientId: 'P-2028', procedure: 'Root Canal Treatment', performedBy: 'Dr. Reyes', date: subtractDays(today, 6) },
  { id: 'D016', itemId: 'I12', itemName: 'Fluoride Varnish', qty: 1, patientId: 'P-2013', procedure: 'Fluoride Treatment', performedBy: 'Dr. Reyes', date: subtractDays(today, 1) },
  { id: 'D017', itemId: 'I11', itemName: 'Disposable Bibs', qty: 1, patientId: 'P-2013', procedure: 'Dental Examination', performedBy: 'Dr. Reyes', date: subtractDays(today, 1) },
  { id: 'D018', itemId: 'I07', itemName: 'Matrix Band', qty: 1, patientId: 'P-1888', procedure: 'Composite Restoration', performedBy: 'Dr. Santos', date: subtractDays(today, 3) },
  { id: 'D019', itemId: 'I11', itemName: 'Disposable Bibs', qty: 2, patientId: 'P-1184', procedure: 'Prophylaxis', performedBy: 'Dr. Santos', date: subtractDays(today, 5) },
  { id: 'D020', itemId: 'I14', itemName: 'Composite Resin B1', qty: 1, patientId: 'P-1129', procedure: 'Composite Restoration', performedBy: 'Dr. Reyes', date: subtractDays(today, 6) },
  { id: 'D021', itemId: 'I13', itemName: 'Suture Material 3-0', qty: 1, patientId: 'P-1129', procedure: 'Surgical Extraction', performedBy: 'Dr. Reyes', date: subtractDays(today, 7) },
  { id: 'D022', itemId: 'I04', itemName: 'Anesthetic Carpule 2%', qty: 1, patientId: 'P-2045', procedure: 'Simple Extraction', performedBy: 'Dr. Santos', date: subtractDays(today, 8) },
  { id: 'D023', itemId: 'I09', itemName: 'Cotton Rolls', qty: 3, patientId: 'P-2109', procedure: 'Composite Restoration', performedBy: 'Dr. Reyes', date: subtractDays(today, 11) },
  { id: 'D024', itemId: 'I08', itemName: 'Gloves (pair)', qty: 2, patientId: 'P-2109', procedure: 'Composite Restoration', performedBy: 'Dr. Reyes', date: subtractDays(today, 11) },
];

const SEED_PAYMENTS: PaymentTransaction[] = [
  { id: 'pay-1', reference: 'TXN-20260910-001', patient: 'Ana Kristina Reyes', patientId: 'P-1042', appointmentId: 'APT-0924-01', service: 'Composite Restoration', amountDue: 2500, amountPaid: 2500, method: 'GCash', status: 'paid', createdAt: '2026-09-10 09:42', paymentDate: '2026-09-10', receiptRef: 'RCT-20260910-001' },
  { id: 'pay-2', reference: 'TXN-20260924-002', patient: 'Ana Kristina Reyes', patientId: 'P-1042', appointmentId: 'APT-0924-02', service: 'Dental Prophylaxis', amountDue: 800, amountPaid: 0, method: 'Cash', status: 'pending', createdAt: '2026-09-24 08:15' },
  { id: 'pay-3', reference: 'TXN-20260924-003', patient: 'Jose dela Cruz', patientId: 'P-2001', appointmentId: 'APT-0925-03', service: 'Root Canal Treatment', amountDue: 12000, amountPaid: 12000, method: 'Bank Transfer', status: 'paid', createdAt: '2026-09-24 08:45', paymentDate: '2026-09-24', proofFile: 'transfer_proof_2001.jpg' },
  { id: 'pay-4', reference: 'TXN-20260924-004', patient: 'Ramon Aurelio Cruz', patientId: 'P-1156', appointmentId: 'APT-0926-04', service: 'Simple Extraction', amountDue: 1500, amountPaid: 0, method: 'Maya', status: 'processing', createdAt: '2026-09-24 09:10' },
  { id: 'pay-5', reference: 'TXN-20260923-005', patient: 'Lorna dela Cruz', patientId: 'P-0743', appointmentId: 'APT-0923-05', service: 'Dental Consultation', amountDue: 500, amountPaid: 0, method: 'GCash', status: 'failed', createdAt: '2026-09-23 16:20' },
  { id: 'pay-6', reference: 'TXN-20260920-006', patient: 'Ben Santos', patientId: 'P-0400', appointmentId: 'APT-0920-06', service: 'PFM Crown', amountDue: 15000, amountPaid: 16500, method: 'Cash', status: 'paid', createdAt: '2026-09-20 12:10', paymentDate: '2026-09-20', receiptRef: 'RCT-20260920-006' },
  { id: 'pay-7', reference: 'TXN-20260926-007', patient: 'Maria Corazon Santos', patientId: 'P-0891', appointmentId: 'APT-0927-07', service: 'Fluoride Treatment', amountDue: 500, amountPaid: 500, method: 'GCash', status: 'paid', createdAt: '2026-09-26 10:05', paymentDate: '2026-09-26', receiptRef: 'RCT-20260926-007' },
];

const SEED_FINANCIAL_AUDIT: FinancialAuditEvent[] = [
  { id: 'fa-1', timestamp: '2026-09-24 08:45', actor: 'Patient', action: 'Payment Request Created', reference: 'TXN-20260924-003', amount: 12000 },
  { id: 'fa-2', timestamp: '2026-09-24 08:15', actor: 'Patient', action: 'Payment Request Created', reference: 'TXN-20260924-002', amount: 800 },
  { id: 'fa-3', timestamp: '2026-09-10 09:43', actor: 'System', action: 'Online Payment Confirmed', reference: 'TXN-20260910-001', amount: 2500 },
  { id: 'fa-4', timestamp: '2026-09-10 09:43', actor: 'System', action: 'Receipt Generated', reference: 'TXN-20260910-001', amount: 2500 },
  { id: 'fa-5', timestamp: '2026-09-10 09:43', actor: 'System', action: 'Balance Updated', reference: 'TXN-20260910-001', amount: 2500 },
  { id: 'fa-6', timestamp: '2026-09-23 16:21', actor: 'System', action: 'Payment Failed', reference: 'TXN-20260923-005', amount: 500 },
  { id: 'fa-7', timestamp: '2026-09-24 07:50', actor: 'Patient', action: 'Refund Requested', reference: 'REF-001', amount: 500 },
  { id: 'fa-8', timestamp: '2026-09-24 07:40', actor: 'Patient', action: 'Cancellation Requested', reference: 'CAN-001', amount: 0 },
  { id: 'fa-9', timestamp: '2026-09-26 10:06', actor: 'System', action: 'Online Payment Confirmed', reference: 'TXN-20260926-007', amount: 500 },
  { id: 'fa-10', timestamp: '2026-09-26 10:06', actor: 'System', action: 'Receipt Generated', reference: 'TXN-20260926-007', amount: 500 },
];

const SEED_CANCELLATIONS: CancellationRequest[] = [
  { id: 'CAN-001', patient: 'Ana Kristina Reyes', patientId: 'P-1042', appointmentId: 'APT-0928-08', service: 'Composite Restoration', appointmentDate: '2026-09-28', appointmentTime: '10:00', reason: 'Schedule conflict', paymentReference: 'TXN-20260910-001', paymentStatus: 'paid', status: 'pending' },
  { id: 'CAN-002', patient: 'Jose dela Cruz', patientId: 'P-2001', appointmentId: 'APT-0929-09', service: 'Dental Consultation', appointmentDate: '2026-09-29', appointmentTime: '14:30', reason: 'Unable to attend', paymentStatus: 'pending', status: 'pending' },
];

const SEED_REFUNDS: RefundRequest[] = [
  { id: 'REF-001', patient: 'Ana Kristina Reyes', patientId: 'P-1042', transactionRef: 'TXN-20260910-001', service: 'Composite Restoration', amountPaid: 2500, requestedAmount: 500, method: 'GCash', paymentDate: '2026-09-10', reason: 'Partial service cancellation', supportingDocument: 'refund_request_ana.pdf', status: 'pending' },
];

const SEED_EXPENSES: ExpenseRecord[] = [
  { id: 'EXP-20260905-001', merchant: 'GC Dental Supply Co.', category: 'Supplies', description: 'Composite resin and routine dental materials', amount: 4500, date: '2026-09-05', receiptNumber: 'OR-91820', receiptFile: 'gcdental_sep.jpg', createdBy: 'Carlo Bautista', createdAt: '2026-09-05 10:12' },
  { id: 'EXP-20260912-002', merchant: 'MERALCO / Maynilad', category: 'Utilities', description: 'Clinic electricity and water', amount: 2500, date: '2026-09-12', receiptNumber: 'UTIL-SEP-26', receiptFile: 'utilities_sep.pdf', createdBy: 'Carlo Bautista', createdAt: '2026-09-12 09:30' },
  { id: 'EXP-20260918-003', merchant: 'MedTech Equipment PH', category: 'Equipment', description: 'Routine dental equipment servicing', amount: 2000, date: '2026-09-18', receiptNumber: 'OR-77412', receiptFile: 'equipment_service.jpg', createdBy: 'Carlo Bautista', createdAt: '2026-09-18 14:05' },
  { id: 'EXP-20260924-004', merchant: 'Clinic Operations', category: 'Other', description: 'Clinic rent and other operating costs', amount: 5500, date: '2026-09-24', createdBy: 'Carlo Bautista', createdAt: '2026-09-24 08:40' },
];

// ── Context ────────────────────────────────────────────────────

interface ClinicContextValue {
  payments: PaymentTransaction[];
  financialAudit: FinancialAuditEvent[];
  cancellationRequests: CancellationRequest[];
  refundRequests: RefundRequest[];
  feeCorrections: FeeCorrection[];
  expenses: ExpenseRecord[];
  createPaymentRequest: (input: Omit<PaymentTransaction, 'id' | 'reference' | 'status' | 'createdAt' | 'amountPaid'> & { proofFile?: string }) => string;
  confirmCashPayment: (reference: string) => void;
  verifyBankTransfer: (reference: string) => void;
  retryOnlinePayment: (reference: string) => void;
  submitCancellationRequest: (input: Omit<CancellationRequest, 'id' | 'status' | 'paymentStatus'>) => void;
  decideCancellation: (id: string, decision: 'approved' | 'rejected', reason?: string) => void;
  decideRefund: (id: string, decision: 'approved' | 'rejected', reason?: string) => void;
  confirmCashRefund: (id: string) => void;
  createFeeCorrection: (transactionRef: string, correctedFee: number, reason: string) => void;
  resolveOverpayment: (reference: string, action: 'future_balance' | 'refund') => void;
  saveExpense: (expense: Omit<ExpenseRecord, 'id' | 'createdAt'>) => 'saved' | 'duplicate';
  inventory: InventoryItem[];
  deductionLog: DeductionEntry[];
  deductInventory: (itemIds: string[], patientId: string, procedure: string, performedBy?: string) => void;
  getStockStatus: (item: InventoryItem) => StockStatus;
  expiryAlertDays: number;
  setExpiryAlertDays: (days: number) => void;
  isExpiringSoon: (expiry: string) => boolean;
  isExpired: (expiry: string) => boolean;
  orders: SupplyOrder[];
  confirmReceived: (orderId: string) => void;
  classifyResponse: (orderId: string, cls: ResponseClass, isOverride?: boolean, reason?: string) => void;
  cancelOrder: (orderId: string) => void;
  suppliers: Supplier[];
  inventoryAlertLog: InventoryAlertLog[];
  inventoryAuditLog: InventoryAuditEntry[];
  overstockReviewNotes: OverstockReviewNote[];
  acknowledgeAlert: (alertId: string) => void;
  resolveOverstockNote: (noteId: string) => void;
  orderDispatchLog: OrderDispatchLog[];
  orderTimeline: OrderTimelineEvent[];
  parseSupplierReply: (text: string) => ResponseClass | 'unclear';
  automationConfig: AutomationConfig;
  setAutomationConfig: (config: AutomationConfig) => void;
  fireDemoTrigger: (trigger: DemoTrigger) => void;
  saveInventoryItem: (item: InventoryItem) => void;
  discardBatch: (itemId: string, batchNo: string) => void;
}

const ClinicContext = createContext<ClinicContextValue | null>(null);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<PaymentTransaction[]>(SEED_PAYMENTS);
  const [financialAudit, setFinancialAudit] = useState<FinancialAuditEvent[]>(SEED_FINANCIAL_AUDIT);
  const [cancellationRequests, setCancellationRequests] = useState<CancellationRequest[]>(SEED_CANCELLATIONS);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>(SEED_REFUNDS);
  const [feeCorrections, setFeeCorrections] = useState<FeeCorrection[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(SEED_EXPENSES);
  const [inventory, setInventory] = useState<InventoryItem[]>(SEED_INVENTORY);
  const [deductionLog, setDeductionLog] = useState<DeductionEntry[]>(SEED_DEDUCTIONS);
  const [orders, setOrders] = useState<SupplyOrder[]>(SEED_ORDERS);
  const [suppliers] = useState<Supplier[]>(SEED_SUPPLIERS);
  const [expiryAlertDays, setExpiryAlertDays] = useState(30);

  const [inventoryAlertLog, setInventoryAlertLog] = useState<InventoryAlertLog[]>([]);
  const [inventoryAuditLog, setInventoryAuditLog] = useState<InventoryAuditEntry[]>([]);
  const [overstockReviewNotes, setOverstockReviewNotes] = useState<OverstockReviewNote[]>([]);
  const [orderDispatchLog, setOrderDispatchLog] = useState<OrderDispatchLog[]>([]);
  const [orderTimeline, setOrderTimeline] = useState<OrderTimelineEvent[]>(SEED_ORDER_TIMELINE);
  const [automationConfig, setAutomationConfig] = useState<AutomationConfig>({
    eodDispatchHour: 18,
    criticalImmediate: true,
    responseWindowHours: 24,
    rerouteChainLimit: 2,
  });
  const [tick, setTick] = useState(0);

  const now = new Date();

  const timestampNow = () =>
    new Date().toLocaleString('en-PH', { hour12: false }).slice(0, 16);

  const addFinancialAudit = (actor: string, action: string, reference: string, amount: number) => {
    setFinancialAudit(prev => [{
      id: `fa-${Date.now()}-${prev.length}`,
      timestamp: new Date().toLocaleString('en-PH', { hour12: false }).slice(0, 16),
      actor,
      action,
      reference,
      amount,
    }, ...prev]);
  };

  const addInventoryAudit = (
    actor: 'system' | 'doctor',
    action: InventoryAuditAction,
    itemId: string,
    itemName: string,
    detail: string,
  ) => {
    setInventoryAuditLog(prev => {
      const entry: InventoryAuditEntry = {
        id: `IA-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ts: Date.now(),
        timestamp: timestampNow(),
        actor,
        action,
        itemId,
        itemName,
        detail,
      };
      const next = [entry, ...prev];
      return next.length > MAX_AUDIT_ENTRIES ? next.slice(0, MAX_AUDIT_ENTRIES) : next;
    });
  };

  const completePayment = (reference: string, action: string, actor: string, amountOverride?: number) => {
    const amount = amountOverride ?? payments.find(item => item.reference === reference)?.amountDue;
    if (amount === undefined) return;
    const receiptRef = `RCT-${Date.now().toString().slice(-10)}`;
    setPayments(prev => prev.map(item => item.reference === reference ? {
        ...item,
        status: 'paid',
        amountPaid: item.amountDue,
        paymentDate: new Date().toISOString().slice(0, 10),
        receiptRef,
      } : item));
    addFinancialAudit(actor, action, reference, amount);
    addFinancialAudit('System', 'Receipt Generated', reference, amount);
    addFinancialAudit('System', 'Balance Updated', reference, amount);
  };

  const createPaymentRequest: ClinicContextValue['createPaymentRequest'] = input => {
    const reference = `TXN-${Date.now()}`;
    const status: PaymentStatus = input.method === 'Cash' ? 'pending' : 'processing';
    const transaction: PaymentTransaction = {
      ...input,
      id: `pay-${Date.now()}`,
      reference,
      amountPaid: 0,
      status,
      createdAt: new Date().toLocaleString('en-PH', { hour12: false }).slice(0, 16),
    };
    setPayments(prev => [transaction, ...prev]);
    addFinancialAudit('Patient', 'Payment Request Created', reference, input.amountDue);
    if (input.method !== 'Cash') {
      setTimeout(() => completePayment(reference, 'Online Payment Confirmed', 'System', input.amountDue), 1800);
    }
    return reference;
  };

  const confirmCashPayment = (reference: string) => completePayment(reference, 'Cash Payment Confirmed', 'Clinic Staff');
  const verifyBankTransfer = (reference: string) => completePayment(reference, 'Bank Transfer Verified', 'Clinic Staff');
  const retryOnlinePayment = (reference: string) => {
    const payment = payments.find(item => item.reference === reference);
    if (!payment || !['GCash', 'Maya'].includes(payment.method)) return;
    setPayments(prev => prev.map(item => item.reference === reference ? { ...item, status: 'processing' } : item));
    setTimeout(() => completePayment(reference, 'Online Payment Confirmed', 'System'), 1200);
  };

  const submitCancellationRequest: ClinicContextValue['submitCancellationRequest'] = input => {
    const paymentStatus = payments.find(item => item.reference === input.paymentReference)?.status ?? 'pending';
    const request: CancellationRequest = { ...input, id: `CAN-${Date.now()}`, status: 'pending', paymentStatus };
    setCancellationRequests(prev => [request, ...prev]);
    addFinancialAudit('Patient', 'Cancellation Requested', request.id, 0);
  };

  const decideCancellation = (id: string, decision: 'approved' | 'rejected', reason?: string) => {
    const request = cancellationRequests.find(item => item.id === id);
    if (!request) return;
    setCancellationRequests(prev => prev.map(item => item.id === id ? { ...item, status: decision, rejectionReason: reason } : item));
    addFinancialAudit('Clinic Staff', decision === 'approved' ? 'Cancellation Approved' : 'Cancellation Rejected', id, 0);
    if (decision === 'approved' && request.paymentStatus === 'paid' && request.paymentReference) {
      const payment = payments.find(item => item.reference === request.paymentReference);
      if (payment) {
        setRefundRequests(prev => [{
          id: `REF-${Date.now()}`,
          patient: request.patient,
          patientId: request.patientId,
          transactionRef: payment.reference,
          service: payment.service,
          amountPaid: payment.amountPaid,
          requestedAmount: payment.amountPaid,
          method: payment.method,
          paymentDate: payment.paymentDate ?? '',
          reason: `Approved cancellation ${request.id}`,
          status: 'pending',
        }, ...prev]);
      }
    }
    if (decision === 'approved') {
      addFinancialAudit('System', 'Appointment Cancelled / Calendar Updated', request.appointmentId, 0);
    }
  };

  const decideRefund = (id: string, decision: 'approved' | 'rejected', reason?: string) => {
    const request = refundRequests.find(item => item.id === id);
    if (!request) return;
    if (decision === 'rejected') {
      setRefundRequests(prev => prev.map(item => item.id === id ? { ...item, status: 'rejected', rejectionReason: reason } : item));
      addFinancialAudit('Clinic Staff', 'Refund Rejected', request.transactionRef, request.requestedAmount);
      return;
    }
    const approvedStatus: RefundStatus = request.method === 'Cash' ? 'awaiting_cash' : 'approved';
    setRefundRequests(prev => prev.map(item => item.id === id ? { ...item, status: approvedStatus } : item));
    addFinancialAudit('Clinic Staff', 'Refund Approved', request.transactionRef, request.requestedAmount);
    if (request.method === 'Cash') {
      addFinancialAudit('System', 'Patient Notified - Cash Refund Ready', request.transactionRef, request.requestedAmount);
      return;
    }
    addFinancialAudit('System', 'Patient Notified - Refund Approved', request.transactionRef, request.requestedAmount);
    setTimeout(() => {
      setRefundRequests(prev => prev.map(item => item.id === id ? { ...item, status: 'processing' } : item));
      addFinancialAudit('System', 'Refund Processing', request.transactionRef, request.requestedAmount);
      setTimeout(() => {
        const refundReference = `RFN-${Date.now()}`;
        setRefundRequests(prev => prev.map(item => item.id === id ? { ...item, status: 'refunded', refundReference } : item));
        addFinancialAudit('System', 'Refund Processed', refundReference, -request.requestedAmount);
        addFinancialAudit('System', 'Balance Updated', refundReference, -request.requestedAmount);
        addFinancialAudit('System', 'Patient Notified - Refund Completed', refundReference, request.requestedAmount);
      }, 700);
    }, 500);
  };

  const confirmCashRefund = (id: string) => {
    const request = refundRequests.find(item => item.id === id);
    if (!request || request.method !== 'Cash' || request.status !== 'awaiting_cash') return;
    const refundReference = `RFN-${Date.now()}`;
    setRefundRequests(prev => prev.map(item => item.id === id ? { ...item, status: 'refunded', refundReference } : item));
    addFinancialAudit('Clinic Staff', 'Cash Refund Confirmed', refundReference, -request.requestedAmount);
    addFinancialAudit('System', 'Balance Updated', refundReference, -request.requestedAmount);
    addFinancialAudit('System', 'Patient Notified - Refund Completed', refundReference, request.requestedAmount);
  };

  const createFeeCorrection = (transactionRef: string, correctedFee: number, reason: string) => {
    const payment = payments.find(item => item.reference === transactionRef);
    if (!payment) return;
    const correction: FeeCorrection = {
      id: `COR-${Date.now()}`,
      transactionRef,
      patient: payment.patient,
      patientId: payment.patientId,
      service: payment.service,
      originalFee: payment.amountDue,
      correctedFee,
      difference: correctedFee - payment.amountDue,
      reason,
      status: 'approved',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setFeeCorrections(prev => [correction, ...prev]);
    setPayments(prev => prev.map(item => item.reference === transactionRef ? { ...item, amountDue: correctedFee } : item));
    addFinancialAudit('Clinic Staff', 'Fee Correction Created', transactionRef, correction.difference);
    addFinancialAudit('Clinic Staff', 'Fee Correction Approved', transactionRef, correction.difference);
    addFinancialAudit('System', 'Balance Updated', transactionRef, correction.difference);
  };

  const resolveOverpayment = (reference: string, action: 'future_balance' | 'refund') => {
    const payment = payments.find(item => item.reference === reference);
    if (!payment || payment.amountPaid <= payment.amountDue) return;
    const overpaid = payment.amountPaid - payment.amountDue;
    if (action === 'refund') {
      setRefundRequests(prev => [{
        id: `REF-${Date.now()}`,
        patient: payment.patient,
        patientId: payment.patientId,
        transactionRef: payment.reference,
        service: payment.service,
        amountPaid: payment.amountPaid,
        requestedAmount: overpaid,
        method: payment.method,
        paymentDate: payment.paymentDate ?? '',
        reason: 'Overpayment refund',
        status: 'pending',
      }, ...prev]);
    }
    addFinancialAudit('Clinic Staff', action === 'refund' ? 'Refund Requested' : 'Overpayment Applied to Future Balance', reference, overpaid);
  };

  const saveExpense: ClinicContextValue['saveExpense'] = expense => {
    const duplicate = expenses.some(item =>
      item.merchant.trim().toLowerCase() === expense.merchant.trim().toLowerCase() &&
      item.date === expense.date &&
      item.amount === expense.amount &&
      (expense.receiptNumber ? item.receiptNumber === expense.receiptNumber : true)
    );
    if (duplicate) return 'duplicate';
    const id = `EXP-${expense.date.split('-').join('')}-${String(expenses.length + 1).padStart(3, '0')}`;
    const createdAt = new Date().toLocaleString('en-PH', { hour12: false }).slice(0, 16);
    setExpenses(prev => [{ ...expense, id, createdAt }, ...prev]);
    addFinancialAudit(expense.createdBy, 'Expense Recorded', id, -expense.amount);
    return 'saved';
  };

  const isExpired = (expiry: string) => new Date(expiry) < now;
  const isExpiringSoon = (expiry: string) => {
    const d = new Date(expiry);
    const msWindow = expiryAlertDays * 86400000;
    return d >= now && d.getTime() - now.getTime() <= msWindow;
  };

  const getStockStatus = (item: InventoryItem): StockStatus => {
    if (item.quantity === 0 || item.quantity <= item.criticalThreshold) return 'critical';
    if (item.quantity <= item.reorderThreshold) return 'low';
    if (item.quantity >= item.overstockThreshold) return 'overstock';
    return 'ok';
  };

  const deductInventory = (
    itemIds: string[],
    patientId: string,
    procedure: string,
    performedBy: string = 'Dr. Reyes',
  ) => {
    const dateStr = now.toISOString().slice(0, 10);
    const newEntries: DeductionEntry[] = [];

    const nextInventory = inventory.map(item => {
      if (!itemIds.includes(item.id) || item.quantity <= 0) return item;
      let remaining = 1;
      const updatedBatches = item.batches.map(b => {
        if (remaining <= 0 || b.qty <= 0) return b;
        const take = Math.min(remaining, b.qty);
        remaining -= take;
        return { ...b, qty: b.qty - take };
      }).filter(b => b.qty > 0);
      newEntries.push({
        id: `D${Date.now()}-${item.id}-${Math.random().toString(36).slice(2, 6)}`,
        itemId: item.id,
        itemName: item.name,
        qty: 1,
        patientId,
        procedure,
        performedBy,
        date: dateStr,
      });
      return { ...item, quantity: item.quantity - 1, batches: updatedBatches };
    });

    setInventory(nextInventory);
    if (newEntries.length > 0) {
      setDeductionLog(prev => [...newEntries, ...prev]);
    }
  };

  const parseSupplierReply = (text: string): ResponseClass | 'unclear' => {
    const normalized = text.toLowerCase();
    const confirmedPatterns = ['confirmed', 'order received', 'we will process', "we'll process", 'noted po', 'salamat po', 'ok po'];
    const unavailablePatterns = ['out of stock', 'unavailable', 'wala po kami', 'cannot fulfill', 'discontinued', 'no stock'];
    const hasConfirmed = confirmedPatterns.some(p => normalized.includes(p));
    const hasUnavailable = unavailablePatterns.some(p => normalized.includes(p));
    if (hasConfirmed && !hasUnavailable) return 'confirmed';
    if (hasUnavailable && !hasConfirmed) return 'unavailable';
    return 'unclear';
  };

  const appendTimeline = (
    orderId: string,
    kind: OrderTimelineKind,
    actor: 'system' | 'doctor' | 'supplier',
    title: string,
    detail: string,
    emailSnippet?: OrderTimelineEvent['emailSnippet'],
  ) => {
    setOrderTimeline(prev => [...prev, {
      id: `TL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orderId,
      ts: Date.now(),
      timestamp: timestampNow(),
      kind,
      actor,
      title,
      detail,
      emailSnippet,
    }]);
  };

  const resolveNextBackupSupplier = (orderId: string, itemId: string): string | null => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return null;
    const tried = new Set<string>();
    let cursor: SupplyOrder | undefined = orders.find(o => o.id === orderId);
    let safety = 0;
    while (cursor && safety < 10) {
      tried.add(cursor.supplierId);
      cursor = cursor.originalOrderId ? orders.find(o => o.id === cursor!.originalOrderId) : undefined;
      safety++;
    }
    return item.backupSupplierIds.find(id => !tried.has(id)) ?? null;
  };

  const rerouteOrder = (orderId: string, reason: 'unavailable' | 'no_response') => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    const nextBackupId = resolveNextBackupSupplier(orderId, target.itemId);
    let triedDepth = 1;
    let cursor: SupplyOrder | undefined = orders.find(o => o.id === orderId);
    while (cursor?.originalOrderId && triedDepth < 10) {
      triedDepth++;
      cursor = orders.find(o => o.id === cursor!.originalOrderId);
    }
    const ts = timestampNow();

    if (!nextBackupId || triedDepth >= automationConfig.rerouteChainLimit) {
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        status: (reason === 'no_response' ? 'no_response' : 'unavailable') as OrderStatus,
        updatedAt: ts,
      } : o));
      appendTimeline(orderId, 'escalated', 'system', 'Reroute chain exhausted',
        `All ${triedDepth} supplier route(s) tried. Requires doctor attention.`);
      return;
    }

    const newOrderId = `ORD-${Date.now()}-R${triedDepth}`;
    const backupSupplier = suppliers.find(s => s.id === nextBackupId);
    const newOrder: SupplyOrder = {
      id: newOrderId,
      poRef: `${target.poRef}R${triedDepth}`,
      itemId: target.itemId,
      itemName: target.itemName,
      qty: target.qty,
      stockAtDraft: target.stockAtDraft,
      unit: target.unit,
      supplierId: nextBackupId,
      unitCost: target.unitCost,
      status: 'queued',
      originalOrderId: orderId,
      createdAt: ts,
      updatedAt: ts,
      queuedAtMs: Date.now(),
    };
    setOrders(prev => [
      ...prev.map(o => o.id === orderId ? {
        ...o,
        status: 'rerouted' as OrderStatus,
        linkedOrderId: newOrderId,
        updatedAt: ts,
      } : o),
      newOrder,
    ]);
    appendTimeline(orderId, 'rerouted', 'system', 'Rerouted to backup supplier',
      `${reason === 'no_response' ? 'No response' : 'Supplier unavailable'} - auto-rerouted to ${backupSupplier?.name ?? nextBackupId}.`);
    appendTimeline(newOrderId, 'created', 'system', 'Backup order created',
      `Rerouted from ${target.poRef}. Queued for dispatch.`);
  };

  const dispatchOrders = (orderIds: string[]) => {
    const targets = orders.filter(o => orderIds.includes(o.id) && o.status === 'queued');
    if (targets.length === 0) return;
    const ts = timestampNow();
    const logs: OrderDispatchLog[] = targets.map(o => {
      const supplier = suppliers.find(s => s.id === o.supplierId);
      const recipientEmail = supplier?.email ?? 'unknown@example.com';
      const recipientName = supplier?.name ?? o.supplierId;
      return {
        id: `DSP-${Date.now()}-${o.id}`,
        orderId: o.id,
        poRef: o.poRef,
        recipientEmail,
        recipientName,
        messageId: `<${Math.random().toString(36).slice(2, 14)}@premierdental.ph>`,
        dispatchedAt: ts,
        deliveryStatus: 'sent',
      };
    });
    setOrders(prev => prev.map(o => targets.find(t => t.id === o.id)
      ? { ...o, status: 'sent' as OrderStatus, updatedAt: ts }
      : o));
    setOrderDispatchLog(prev => [...logs, ...prev]);
    targets.forEach((o, idx) => {
      const log = logs[idx];
      const supplier = suppliers.find(s => s.id === o.supplierId);
      const fallbackNote = !supplier
        ? ' · WARNING: supplier record missing — email fell back to unknown@example.com'
        : '';
      appendTimeline(o.id, 'dispatched', 'system', 'PO dispatched via SMTP email (simulated)',
        `PDF PO emailed to ${log.recipientName} (${log.recipientEmail}). Awaiting response.${fallbackNote}`);
    });
  };

  const simulateReply = (orderId: string, cls: ResponseClass, bodyText: string) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    const supplier = suppliers.find(s => s.id === target.supplierId);
    const ts = timestampNow();
    const keywords = ['confirmed', 'order received', 'out of stock', 'unavailable', 'cannot fulfill', 'discontinued', 'wala po kami'];
    const lower = bodyText.toLowerCase();
    const kw = keywords.find(k => lower.includes(k)) ?? cls;
    const idx = lower.indexOf(kw);
    const before = idx >= 0 ? bodyText.slice(0, idx) : bodyText;
    const after = idx >= 0 ? bodyText.slice(idx + kw.length) : '';
    const snippet = {
      sender: supplier?.email ?? 'supplier@example.com',
      before,
      keyword: idx >= 0 ? bodyText.slice(idx, idx + kw.length) : kw,
      after,
    };
    appendTimeline(orderId, 'reply-parsed', 'supplier',
      `System parsed email (Keyword Match - ${cls})`,
      `Matched keyword in supplier reply from ${supplier?.name ?? target.supplierId}.`,
      snippet);
    if (cls === 'confirmed') {
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o, status: 'being_delivered' as OrderStatus,
        responseClass: 'confirmed', supplierResponse: bodyText,
        confirmedAt: ts, updatedAt: ts,
      } : o));
      appendTimeline(orderId, 'classified', 'system', 'Status - Being Delivered',
        'Awaiting physical arrival. Doctor will confirm receipt.');
    } else if (cls === 'unavailable') {
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o, responseClass: 'unavailable', supplierResponse: bodyText, updatedAt: ts,
      } : o));
      rerouteOrder(orderId, 'unavailable');
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o, status: 'unclear' as OrderStatus,
        responseClass: 'unclear', supplierResponse: bodyText, updatedAt: ts,
      } : o));
    }
  };

  const forceTimeout = (orderId: string) => {
    const target = orders.find(o => o.id === orderId);
    if (!target || target.status !== 'sent') return;
    const supplierWindow = suppliers.find(s => s.id === target.supplierId)?.responseWindowHours
      ?? automationConfig.responseWindowHours;
    appendTimeline(orderId, 'timeout', 'system', 'Response window expired',
      `No reply received within ${supplierWindow}h window. Triggering reroute.`);
    rerouteOrder(orderId, 'no_response');
  };

  const fireDemoTrigger = (trigger: DemoTrigger) => {
    switch (trigger) {
      case 'force-eod-dispatch': {
        const queued = orders.filter(o => o.status === 'queued').map(o => o.id);
        dispatchOrders(queued);
        break;
      }
      case 'simulate-reply-confirmed': {
        const target = orders.find(o => o.status === 'sent');
        if (target) simulateReply(target.id, 'confirmed', 'Confirmed. Order received. We will process this and ship within 2 days.');
        break;
      }
      case 'simulate-reply-unavailable': {
        const target = orders.find(o => o.status === 'sent');
        if (target) simulateReply(target.id, 'unavailable', 'Out of stock. Cannot fulfill this order at the moment.');
        break;
      }
      case 'simulate-no-response': {
        const target = orders.find(o => o.status === 'sent');
        if (target) forceTimeout(target.id);
        break;
      }
      case 'simulate-email-bounce': {
        const target = orders.find(o => o.status === 'sent');
        if (!target) break;
        const log = orderDispatchLog.find(l => l.orderId === target.id && l.deliveryStatus === 'sent');
        if (log) {
          setOrderDispatchLog(prev => prev.map(l => l.id === log.id ? { ...l, deliveryStatus: 'bounced' } : l));
          appendTimeline(target.id, 'escalated', 'system', 'Email bounce detected',
            `SMTP delivery to ${log.recipientEmail} bounced. Doctor must verify supplier email record.`);
        }
        break;
      }
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    const alert = inventoryAlertLog.find(a => a.id === alertId);
    const ts = timestampNow();
    setInventoryAlertLog(prev => prev.map(a => a.id === alertId
      ? { ...a, acknowledged: true, acknowledgedAt: ts, acknowledgedBy: 'doctor' }
      : a));
    if (alert) {
      const severityLabel = alert.severity === 'critical' ? 'Critical'
        : alert.severity === 'low' ? 'Low / Reorder'
        : 'Overstock';
      addInventoryAudit(
        'doctor',
        'alert-acknowledged',
        alert.itemId,
        alert.itemName,
        `${severityLabel} alert acknowledged (was ${alert.qty} at threshold ${alert.threshold})`,
      );
    }
  };

  const resolveOverstockNote = (noteId: string) => {
    const note = overstockReviewNotes.find(n => n.id === noteId);
    if (!note) return;
    setOverstockReviewNotes(prev => prev.map(n => n.id === noteId ? { ...n, status: 'resolved' } : n));
    if (note.linkedAlertId) {
      const ts = timestampNow();
      setInventoryAlertLog(prev => prev.map(a => a.id === note.linkedAlertId
        ? { ...a, acknowledged: true, acknowledgedAt: ts, acknowledgedBy: 'doctor' }
        : a));
    }
    addInventoryAudit(
      'doctor',
      'overstock-note-resolved',
      note.itemId,
      note.itemName,
      `Overstock review note resolved (${note.qty} at threshold ${note.overstockThreshold})`,
    );
  };

  /**
   * Doctor classifies (or overrides) an order's response classification.
   *
   * @param orderId     — target order
   * @param cls         — the classification the doctor is applying
   * @param isOverride  — true when reclassifying an already-classified order
   *                      (doc §15: "Allow the doctor to override classification
   *                      manually at any time, with an audit log entry")
   * @param reason      — optional free-text reason, recorded in the audit entry
   *
   * Side effects when `isOverride` is true and the classification changes to
   * `Confirmed` on a rerouted parent: any still-active child order in a
   * pre-delivery state is cancelled, since the doctor has decided the
   * original supplier is going to deliver after all.
   *
   * A same-state override (e.g. Confirmed → Confirmed) is a no-op and is
   * skipped entirely — the timeline stays clean, and no reroute chain is
   * accidentally re-triggered by a duplicate click.
   */
  const classifyResponse = (
    orderId: string,
    cls: ResponseClass,
    isOverride = false,
    reason?: string,
  ) => {
    const dateStr = now.toISOString().slice(0, 10);
    const target = orders.find(o => o.id === orderId);
    if (!target) return;

    const clsLabel = cls === 'confirmed' ? 'Confirmed'
      : cls === 'unavailable' ? 'Unavailable'
      : cls === 'no_response' ? 'No Response'
      : 'Unclear';

    // Same-state override = no-op. Skip the state change and skip the audit
    // entry, otherwise the timeline fills with "reclassified" rows that
    // reflect nothing (and re-fire reroute chains in the unavailable /
    // no_response cases).
    if (isOverride && target.responseClass === cls) return;

    // If the doctor is overriding a rerouted parent back to Confirmed, cancel
    // any still-pending child so we don't double-order the same stock.
    if (isOverride && cls === 'confirmed' && target.linkedOrderId) {
      const child = orders.find(o => o.id === target.linkedOrderId);
      if (child && ['queued', 'sent'].includes(child.status)) {
        setOrders(prev => prev.map(o => o.id === child.id
          ? { ...o, status: 'cancelled' as OrderStatus, updatedAt: dateStr }
          : o));
        appendTimeline(child.id, 'cancelled', 'system', 'Backup order cancelled',
          `Parent ${target.poRef} reclassified to Confirmed. Backup no longer needed.`);
      }
    }

    // Apply the state change
    if (cls === 'confirmed') {
      setOrders(prev => prev.map(o => o.id === orderId
        ? { ...o, responseClass: cls, status: 'being_delivered' as OrderStatus, confirmedAt: dateStr, updatedAt: dateStr }
        : o));
    } else if (cls === 'unavailable') {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, responseClass: cls, updatedAt: dateStr } : o));
      queueMicrotask(() => rerouteOrder(orderId, 'unavailable'));
    } else if (cls === 'no_response') {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, responseClass: cls, updatedAt: dateStr } : o));
      queueMicrotask(() => rerouteOrder(orderId, 'no_response'));
    } else {
      setOrders(prev => prev.map(o => o.id === orderId
        ? { ...o, responseClass: cls, status: 'unclear' as OrderStatus, updatedAt: dateStr }
        : o));
    }

    // Audit trail entry
    const title = isOverride
      ? `Doctor reclassified response as "${clsLabel}"`
      : `Doctor classified response as "${clsLabel}"`;
    const baseDetail = isOverride
      ? `Overrode previous classification. Following the ${clsLabel.toLowerCase()} path.`
      : `Following the ${clsLabel.toLowerCase()} path.`;
    const detail = reason ? `${baseDetail} Reason: ${reason}` : baseDetail;
    appendTimeline(orderId, isOverride ? 'reclassified' : 'classified', 'doctor', title, detail);
  };

  const cancelOrder = (orderId: string) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    const ts = timestampNow();
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'cancelled', updatedAt: ts } : o
    ));
    appendTimeline(orderId, 'cancelled', 'doctor', 'Order cancelled by doctor',
      `${target.poRef} closed as cancelled after manual review.`);
  };

  const confirmReceived = (orderId: string) => {
    const ts = timestampNow();
    const dateStr = now.toISOString().slice(0, 10);
    let restoredItemId: string | null = null;
    let restoredQty = 0;
    setOrders(prev => {
      const target = prev.find(o => o.id === orderId);
      if (!target) return prev;
      restoredItemId = target.itemId;
      restoredQty = target.qty;
      return prev.map(o => o.id === orderId ? {
        ...o,
        status: 'completed' as OrderStatus,
        receivedAt: dateStr,
        updatedAt: ts,
      } : o);
    });
    if (restoredItemId) {
      setInventory(inv => inv.map(item => {
        if (item.id !== restoredItemId) return item;
        const newBatch: InventoryBatch = {
          batchNo: `B${now.getFullYear()}-${restoredItemId!.slice(1)}-RCV`,
          qty: restoredQty,
          expiry: addDays(now, 365),
        };
        return {
          ...item,
          quantity: item.quantity + restoredQty,
          everStocked: true,
          batches: [...item.batches, newBatch],
        };
      }));
      appendTimeline(orderId, 'received', 'doctor', 'Physical receipt confirmed',
        `${restoredQty} units added to inventory. Order completed.`);
    }
  };

  const saveInventoryItem = (item: InventoryItem) => {
    const exists = inventory.find(i => i.id === item.id);
    setInventory(prev => {
      const found = prev.find(i => i.id === item.id);
      return found ? prev.map(i => i.id === item.id ? item : i) : [...prev, item];
    });
    addInventoryAudit(
      'doctor',
      exists ? 'item-updated' : 'item-created',
      item.id,
      item.name,
      exists
        ? `Configuration updated (Critical ${item.criticalThreshold}, Reorder ${item.reorderThreshold}, Overstock ${item.overstockThreshold})`
        : `Registered in the master supply list — unit ${item.unit}`,
    );
  };

  const discardBatch = (itemId: string, batchNo: string) => {
    const item = inventory.find(i => i.id === itemId);
    const batch = item?.batches.find(b => b.batchNo === batchNo);
    setInventory(prev => prev.map(invItem => {
      if (invItem.id !== itemId) return invItem;
      const b = invItem.batches.find(x => x.batchNo === batchNo);
      if (!b) return invItem;
      return {
        ...invItem,
        quantity: Math.max(0, invItem.quantity - b.qty),
        batches: invItem.batches.filter(x => x.batchNo !== batchNo),
      };
    }));
    if (item && batch) {
      const expired = new Date(batch.expiry).getTime() < Date.now();
      addInventoryAudit(
        'doctor',
        'batch-discarded',
        itemId,
        item.name,
        `Batch ${batchNo} removed — ${batch.qty} ${item.unit} (${expired ? 'expired' : 'removed early'})`,
      );
    }
  };

  const inventoryAlertLogRef = useRef(inventoryAlertLog);
  const ordersRef = useRef(orders);

  useEffect(() => {
    inventoryAlertLogRef.current = inventoryAlertLog;
  }, [inventoryAlertLog]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // ── Effects ──────────────────────────────────────────────────

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // M18 — threshold watcher
  useEffect(() => {
    const newAlerts: InventoryAlertLog[] = [];
    const newOrders: SupplyOrder[] = [];
    const newNotes: OverstockReviewNote[] = [];
    const newTimeline: OrderTimelineEvent[] = [];
    const newAudit: InventoryAuditEntry[] = [];
    const resolvedItemIds: string[] = [];
    // Alerts for the same item at a lower severity that get superseded when
    // a higher-severity alert fires in this pass. Marked auto-resolved in
    // the state flush below, per the doc's "highest severity wins" rule.
    const supersededAlertIds: string[] = [];
    const ts = timestampNow();
    const nowMs = Date.now();

    inventory.forEach(item => {
      // Skip items that have never carried stock. These are pre-configured
      // records (added via the Add Item drawer with qty 0) waiting for their
      // first delivery — the watcher must not fire
