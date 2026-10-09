import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
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
  linkedOrderId?: string;
  linkedNoteId?: string;
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
  | 'rerouted'
  | 'timeout'
  | 'escalated'
  | 'received'
  | 'document';

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

// ── Seed Data ─────────────────────────────────────────────────

const SEED_SUPPLIERS: Supplier[] = [
  { id: 'S01', name: 'GC Dental Supply Co.', contactPerson: 'Maria Santos', phone: '+63 917 555 0101', email: 'orders@gcdental.ph', address: '14 Dental Ave, Makati City', products: ['I01','I02','I03','I09','I10'], leadTimeDays: 2, responseWindowHours: 24, paymentTerms: 'Net 30', status: 'active', responseRate: 92, avgResponseTimeHrs: 8, rerouteFrequency: 1 },
  { id: 'S02', name: 'MedDent Philippines', contactPerson: 'Juan Cruz', phone: '+63 918 555 0202', email: 'supply@meddent.ph', address: '7 Medic Blvd, Quezon City', products: ['I04','I05'], leadTimeDays: 3, responseWindowHours: 24, paymentTerms: 'Net 15', status: 'active', responseRate: 88, avgResponseTimeHrs: 12, rerouteFrequency: 2 },
  { id: 'S03', name: 'UniMed Supplies', contactPerson: 'Rosa Dela Torre', phone: '+63 916 555 0303', email: 'info@unimed.ph', address: '22 Health Plaza, Pasig City', products: ['I06','I07','I08'], leadTimeDays: 1, responseWindowHours: 12, paymentTerms: 'COD', status: 'active', responseRate: 97, avgResponseTimeHrs: 5, rerouteFrequency: 0 },
  { id: 'S04', name: 'DentaCore Backup PH', contactPerson: 'Leo Bautista', phone: '+63 919 555 0404', email: 'backup@dentacore.ph', address: '5 Supply St, Taguig City', products: ['I01','I02','I03','I04','I05'], leadTimeDays: 3, responseWindowHours: 24, paymentTerms: 'Net 30', status: 'backup', responseRate: 85, avgResponseTimeHrs: 18, rerouteFrequency: 0 },
  { id: 'S05', name: 'ProDental Warehouse', contactPerson: 'Claire Sy', phone: '+63 920 555 0505', email: 'orders@prodental.ph', address: '100 Commerce Rd, Mandaluyong', products: ['I06','I07','I08','I09','I10'], leadTimeDays: 2, responseWindowHours: 12, paymentTerms: 'Net 15', status: 'backup', responseRate: 90, avgResponseTimeHrs: 10, rerouteFrequency: 0 },
];

const today = new Date();
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10);
const subtractDays = (d: Date, n: number) => addDays(d, -n);

const SEED_INVENTORY: InventoryItem[] = [
  { id: 'I01', name: 'Composite Resin A2', category: 'Restorative', unit: 'syringe', unitCost: 420, supplierId: 'S01', backupSupplierIds: ['S04'], quantity: 3, criticalThreshold: 2, reorderThreshold: 5, overstockThreshold: 20, batches: [{ batchNo: 'B2026-01A', qty: 3, expiry: addDays(today, 25) }] },
  { id: 'I02', name: 'Composite Resin A3', category: 'Restorative', unit: 'syringe', unitCost: 420, supplierId: 'S01', backupSupplierIds: ['S04'], quantity: 8, criticalThreshold: 2, reorderThreshold: 5, overstockThreshold: 20, batches: [{ batchNo: 'B2026-02A', qty: 8, expiry: addDays(today, 180) }] },
  { id: 'I03', name: 'Bonding Agent', category: 'Restorative', unit: 'bottle', unitCost: 750, supplierId: 'S01', backupSupplierIds: ['S04'], quantity: 0, criticalThreshold: 1, reorderThreshold: 2, overstockThreshold: 8, batches: [] },
  { id: 'I04', name: 'Anesthetic Carpule 2%', category: 'Anesthetics', unit: 'carpule', unitCost: 65, supplierId: 'S02', backupSupplierIds: ['S04'], quantity: 24, criticalThreshold: 10, reorderThreshold: 20, overstockThreshold: 100, batches: [{ batchNo: 'B2026-04A', qty: 10, expiry: addDays(today, 45) }, { batchNo: 'B2026-04B', qty: 14, expiry: addDays(today, 240) }] },
  { id: 'I05', name: 'Dental Cement', category: 'Restorative', unit: 'pack', unitCost: 380, supplierId: 'S02', backupSupplierIds: ['S04'], quantity: 2, criticalThreshold: 2, reorderThreshold: 3, overstockThreshold: 12, batches: [{ batchNo: 'B2026-05A', qty: 2, expiry: addDays(today, 320) }] },
  { id: 'I06', name: 'Rubber Dam (pack)', category: 'Isolation', unit: 'pack', unitCost: 290, supplierId: 'S03', backupSupplierIds: ['S05'], quantity: 1, criticalThreshold: 1, reorderThreshold: 3, overstockThreshold: 10, batches: [{ batchNo: 'B2026-06A', qty: 1, expiry: addDays(today, 730) }] },
  { id: 'I07', name: 'Matrix Band', category: 'Isolation', unit: 'pack', unitCost: 155, supplierId: 'S03', backupSupplierIds: ['S05'], quantity: 18, criticalThreshold: 5, reorderThreshold: 10, overstockThreshold: 50, batches: [{ batchNo: 'B2026-07A', qty: 18, expiry: addDays(today, 500) }] },
  { id: 'I08', name: 'Gloves (pair)', category: 'Consumables', unit: 'pair', unitCost: 8, supplierId: 'S03', backupSupplierIds: ['S05'], quantity: 150, criticalThreshold: 20, reorderThreshold: 50, overstockThreshold: 300, batches: [{ batchNo: 'B2026-08A', qty: 150, expiry: addDays(today, 400) }] },
  { id: 'I09', name: 'Cotton Rolls', category: 'Consumables', unit: 'roll', unitCost: 3, supplierId: 'S01', backupSupplierIds: ['S05'], quantity: 20, criticalThreshold: 10, reorderThreshold: 30, overstockThreshold: 150, batches: [{ batchNo: 'B2026-09A', qty: 20, expiry: addDays(today, 600) }] },
  { id: 'I10', name: 'Gauze Pads', category: 'Consumables', unit: 'pad', unitCost: 4, supplierId: 'S01', backupSupplierIds: ['S05'], quantity: 5, criticalThreshold: 15, reorderThreshold: 40, overstockThreshold: 200, batches: [{ batchNo: 'B2026-10A', qty: 5, expiry: addDays(today, 550) }] },
];

const SEED_ORDERS: SupplyOrder[] = [
  { id: 'ORD-001', poRef: 'PO-2026-041', itemId: 'I01', itemName: 'Composite Resin A2', qty: 10, unit: 'syringe', supplierId: 'S01', unitCost: 420, status: 'being_delivered', supplierResponse: 'Confirmed. Order received. We will process this.', responseClass: 'confirmed', createdAt: subtractDays(today, 2), updatedAt: subtractDays(today, 1), confirmedAt: subtractDays(today, 1) },
  { id: 'ORD-002', poRef: 'PO-2026-042', itemId: 'I03', itemName: 'Bonding Agent', qty: 4, unit: 'bottle', supplierId: 'S01', unitCost: 750, status: 'unclear', supplierResponse: 'Hi, do you need the 5ml or 7ml version? We have both in stock.', responseClass: 'unclear', createdAt: subtractDays(today, 1), updatedAt: subtractDays(today, 0) },
  { id: 'ORD-003', poRef: 'PO-2026-043', itemId: 'I05', itemName: 'Dental Cement', qty: 6, unit: 'pack', supplierId: 'S02', unitCost: 380, status: 'rerouted', supplierResponse: 'Out of stock. Cannot fulfill.', responseClass: 'unavailable', linkedOrderId: 'ORD-004', createdAt: subtractDays(today, 3), updatedAt: subtractDays(today, 2) },
  { id: 'ORD-004', poRef: 'PO-2026-043R1', itemId: 'I05', itemName: 'Dental Cement', qty: 6, unit: 'pack', supplierId: 'S04', unitCost: 390, status: 'sent', originalOrderId: 'ORD-003', createdAt: subtractDays(today, 2), updatedAt: subtractDays(today, 2) },
  { id: 'ORD-005', poRef: 'PO-2026-044', itemId: 'I06', itemName: 'Rubber Dam (pack)', qty: 5, unit: 'pack', supplierId: 'S03', unitCost: 290, status: 'queued', createdAt: subtractDays(today, 0), updatedAt: subtractDays(today, 0) },
  { id: 'ORD-006', poRef: 'PO-2026-040', itemId: 'I02', itemName: 'Composite Resin A3', qty: 8, unit: 'syringe', supplierId: 'S01', unitCost: 420, status: 'completed', supplierResponse: 'Noted po. Will deliver tomorrow.', responseClass: 'confirmed', createdAt: subtractDays(today, 7), updatedAt: subtractDays(today, 5), confirmedAt: subtractDays(today, 6), receivedAt: subtractDays(today, 5) },
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
];

const SEED_PAYMENTS: PaymentTransaction[] = [
  { id: 'pay-1', reference: 'TXN-20260910-001', patient: 'Ana Kristina Reyes', patientId: 'P-1042', appointmentId: 'APT-0924-01', service: 'Composite Restoration', amountDue: 2500, amountPaid: 2500, method: 'GCash', status: 'paid', createdAt: '2026-09-10 09:42', paymentDate: '2026-09-10', receiptRef: 'RCT-20260910-001' },
  { id: 'pay-2', reference: 'TXN-20260924-002', patient: 'Ana Kristina Reyes', patientId: 'P-1042', appointmentId: 'APT-0924-02', service: 'Dental Prophylaxis', amountDue: 800, amountPaid: 0, method: 'Cash', status: 'pending', createdAt: '2026-09-24 08:15' },
  { id: 'pay-3', reference: 'TXN-20260924-003', patient: 'Jose dela Cruz', patientId: 'P-2001', appointmentId: 'APT-0925-03', service: 'Root Canal Treatment', amountDue: 12000, amountPaid: 12000, method: 'Bank Transfer', status: 'paid', createdAt: '2026-09-24 08:45', paymentDate: '2026-09-24', proofFile: 'transfer_proof_2001.jpg' },
  { id: 'pay-4', reference: 'TXN-20260924-004', patient: 'Ramon Aurelio Cruz', patientId: 'P-1156', appointmentId: 'APT-0926-04', service: 'Simple Extraction', amountDue: 1500, amountPaid: 0, method: 'Maya', status: 'processing', createdAt: '2026-09-24 09:10' },
  { id: 'pay-5', reference: 'TXN-20260923-005', patient: 'Lorna dela Cruz', patientId: 'P-0743', appointmentId: 'APT-0923-05', service: 'Dental Consultation', amountDue: 500, amountPaid: 0, method: 'GCash', status: 'failed', createdAt: '2026-09-23 16:20' },
  { id: 'pay-6', reference: 'TXN-20260920-006', patient: 'Ben Santos', patientId: 'P-0400', appointmentId: 'APT-0920-06', service: 'PFM Crown', amountDue: 15000, amountPaid: 16500, method: 'Cash', status: 'paid', createdAt: '2026-09-20 12:10', paymentDate: '2026-09-20', receiptRef: 'RCT-20260920-006' },
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
  classifyResponse: (orderId: string, cls: ResponseClass) => void;
  cancelOrder: (orderId: string) => void;
  suppliers: Supplier[];
  inventoryAlertLog: InventoryAlertLog[];
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
  removeInventoryItem: (itemId: string) => void;
  discardBatch: (itemId: string, batchNo: string) => void;
  downloadPurchaseOrder: (orderId: string) => void;
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
  const [overstockReviewNotes, setOverstockReviewNotes] = useState<OverstockReviewNote[]>([]);
  const [orderDispatchLog, setOrderDispatchLog] = useState<OrderDispatchLog[]>([]);
  const [orderTimeline, setOrderTimeline] = useState<OrderTimelineEvent[]>([]);
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

  // M17: StrictMode-safe deduction — compute new state from snapshot,
  // never push to a side array from inside the setState updater.
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
      unit: target.unit,
      supplierId: nextBackupId,
      unitCost: target.unitCost,
      status: 'queued',
      originalOrderId: orderId,
      createdAt: ts,
      updatedAt: ts,
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
      return {
        id: `DSP-${Date.now()}-${o.id}`,
        orderId: o.id,
        poRef: o.poRef,
        recipientEmail: supplier?.email ?? 'unknown@example.com',
        recipientName: supplier?.name ?? o.supplierId,
        messageId: `<${Math.random().toString(36).slice(2, 14)}@premierdental.ph>`,
        dispatchedAt: ts,
        deliveryStatus: 'sent',
      };
    });
    setOrders(prev => prev.map(o => targets.find(t => t.id === o.id)
      ? { ...o, status: 'sent' as OrderStatus, updatedAt: ts }
      : o));
    setOrderDispatchLog(prev => [...logs, ...prev]);
    targets.forEach(o => {
      const supplier = suppliers.find(s => s.id === o.supplierId);
      appendTimeline(o.id, 'dispatched', 'system', 'PO dispatched via SMTP email',
        `PDF PO emailed to ${supplier?.name ?? o.supplierId} (${supplier?.email ?? '-'}). Awaiting response.`);
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
    const ts = timestampNow();
    setInventoryAlertLog(prev => prev.map(a => a.id === alertId
      ? { ...a, acknowledged: true, acknowledgedAt: ts }
      : a));
  };

  const resolveOverstockNote = (noteId: string) => {
    const note = overstockReviewNotes.find(n => n.id === noteId);
    if (!note) return;
    setOverstockReviewNotes(prev => prev.map(n => n.id === noteId ? { ...n, status: 'resolved' } : n));
    if (note.linkedAlertId) {
      const ts = timestampNow();
      setInventoryAlertLog(prev => prev.map(a => a.id === note.linkedAlertId
        ? { ...a, acknowledged: true, acknowledgedAt: ts }
        : a));
    }
  };

  const classifyResponse = (orderId: string, cls: ResponseClass) => {
    const dateStr = now.toISOString().slice(0, 10);
    setOrders(prev => {
      const target = prev.find(o => o.id === orderId);
      if (!target) return prev;
      if (cls === 'confirmed') {
        return prev.map(o => o.id === orderId
          ? { ...o, responseClass: cls, status: 'being_delivered' as OrderStatus, confirmedAt: dateStr, updatedAt: dateStr }
          : o
        );
      }
      if (cls === 'unavailable') {
        queueMicrotask(() => rerouteOrder(orderId, 'unavailable'));
        return prev.map(o => o.id === orderId ? { ...o, responseClass: cls, updatedAt: dateStr } : o);
      }
      return prev.map(o => o.id === orderId ? { ...o, responseClass: cls, status: 'unclear' as OrderStatus, updatedAt: dateStr } : o);
    });
  };

  const cancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'cancelled', updatedAt: now.toISOString().slice(0, 10) } : o
    ));
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
        return { ...item, quantity: item.quantity + restoredQty, batches: [...item.batches, newBatch] };
      }));
      appendTimeline(orderId, 'received', 'doctor', 'Physical receipt confirmed',
        `${restoredQty} units added to inventory. Order completed.`);
    }
  };

  // ── Inventory item CRUD + batch discard ────────────────

  const saveInventoryItem = (item: InventoryItem) => {
    setInventory(prev => {
      const exists = prev.find(i => i.id === item.id);
      return exists ? prev.map(i => i.id === item.id ? item : i) : [...prev, item];
    });
  };

  const removeInventoryItem = (itemId: string) => {
    setInventory(prev => prev.filter(i => i.id !== itemId));
  };

  const discardBatch = (itemId: string, batchNo: string) => {
    setInventory(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const batch = item.batches.find(b => b.batchNo === batchNo);
      if (!batch) return item;
      return {
        ...item,
        quantity: Math.max(0, item.quantity - batch.qty),
        batches: item.batches.filter(b => b.batchNo !== batchNo),
      };
    }));
  };

  // Mock PDF PO — generates a plain-text structured PO and triggers download.
  const downloadPurchaseOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const supplier = suppliers.find(s => s.id === order.supplierId);
    const subtotal = order.qty * order.unitCost;
    const lines = [
      '═══════════════════════════════════════════════════════════',
      '                     PURCHASE ORDER',
      '                    Premier Dental Solutions PH',
      '═══════════════════════════════════════════════════════════',
      '',
      `PO Reference:     ${order.poRef}`,
      `Order Date:       ${order.createdAt}`,
      `Order Status:     ${order.status.toUpperCase()}`,
      order.originalOrderId ? `Rerouted From:    ${order.originalOrderId}` : '',
      '',
      '───────────────────────────────────────────────────────────',
      'SUPPLIER',
      '───────────────────────────────────────────────────────────',
      `Company:          ${supplier?.name ?? order.supplierId}`,
      `Contact Person:   ${supplier?.contactPerson ?? '—'}`,
      `Email:            ${supplier?.email ?? '—'}`,
      `Phone:            ${supplier?.phone ?? '—'}`,
      `Payment Terms:    ${supplier?.paymentTerms ?? '—'}`,
      `Lead Time:        ${supplier?.leadTimeDays ?? '—'} days`,
      '',
      '───────────────────────────────────────────────────────────',
      'BILL TO',
      '───────────────────────────────────────────────────────────',
      'Premier Dental Solutions PH',
      'Makati Branch',
      'procurement@premierdental.ph',
      '',
      '───────────────────────────────────────────────────────────',
      'LINE ITEMS',
      '───────────────────────────────────────────────────────────',
      `Item Name:        ${order.itemName}`,
      `Internal SKU:     ${order.itemId}`,
      `Quantity:         ${order.qty} ${order.unit}`,
      `Unit Cost:        ₱${order.unitCost.toLocaleString()}`,
      `Subtotal:         ₱${subtotal.toLocaleString()}`,
      '',
      '───────────────────────────────────────────────────────────',
      `TOTAL AMOUNT:     ₱${subtotal.toLocaleString()}`,
      '───────────────────────────────────────────────────────────',
      '',
      'This document was auto-generated by the Supply Ordering module (M20).',
      'For inquiries, contact procurement@premierdental.ph.',
      '',
    ].filter(Boolean).join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${order.poRef}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    appendTimeline(orderId, 'document', 'system', 'Purchase Order downloaded',
      `Structured PO document generated and saved as ${order.poRef}.txt.`);
  };

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
    const resolvedItemIds: string[] = [];
    const ts = timestampNow();

    inventory.forEach(item => {
      const status = getStockStatus(item);
      if (status === 'ok') { resolvedItemIds.push(item.id); return; }
      const alreadyAlerted = inventoryAlertLog.some(a => a.itemId === item.id && !a.acknowledged && a.severity === status);
      if (alreadyAlerted) return;
      const hasActiveOrder = orders.some(o => o.itemId === item.id && !['completed', 'cancelled', 'unavailable'].includes(o.status));
      if (status !== 'overstock' && hasActiveOrder) return;

      if (status === 'overstock') {
        const alertId = `ALRT-${Date.now()}-${item.id}`;
        const noteId = `OSN-${Date.now()}-${item.id}`;
        newNotes.push({
          id: noteId,
          itemId: item.id,
          itemName: item.name,
          qty: item.quantity,
          overstockThreshold: item.overstockThreshold,
          reviewNote: `Stock at ${item.quantity} ${item.unit} — above overstock threshold of ${item.overstockThreshold}. Ordering suppressed. Review consumption or adjust threshold.`,
          createdAt: ts,
          status: 'open',
          linkedAlertId: alertId,
        });
        newAlerts.push({
          id: alertId,
          itemId: item.id,
          itemName: item.name,
          severity: 'overstock',
          qty: item.quantity,
          threshold: item.overstockThreshold,
          triggeredAt: ts,
          acknowledged: false,
          linkedNoteId: noteId,
        });
        return;
      }

      const severity: 'critical' | 'low' = status;
      const orderId = `ORD-${Date.now()}-${item.id}-${severity}`;
      const suggestedQty = Math.max(item.overstockThreshold - item.quantity, item.reorderThreshold);
      newOrders.push({
        id: orderId,
        poRef: `PO-${Date.now().toString().slice(-6)}`,
        itemId: item.id,
        itemName: item.name,
        qty: suggestedQty,
        unit: item.unit,
        supplierId: item.supplierId,
        unitCost: item.unitCost,
        status: 'queued',
        createdAt: ts,
        updatedAt: ts,
      });
      newAlerts.push({
        id: `ALRT-${Date.now()}-${item.id}`,
        itemId: item.id,
        itemName: item.name,
        severity,
        qty: item.quantity,
        threshold: severity === 'critical' ? item.criticalThreshold : item.reorderThreshold,
        triggeredAt: ts,
        acknowledged: false,
        linkedOrderId: orderId,
      });
      newTimeline.push({
        id: `TL-${Date.now()}-${orderId}-created`,
        orderId,
        ts: Date.now(),
        timestamp: ts,
        kind: 'created',
        actor: 'system',
        title: `Auto-drafted ${severity} order`,
        detail: `Stock at ${item.quantity} ${item.unit} (threshold ${severity === 'critical' ? item.criticalThreshold : item.reorderThreshold}). Drafted PO for ${suggestedQty} ${item.unit}.`,
      });
    });

    if (newAlerts.length) setInventoryAlertLog(prev => [...newAlerts, ...prev]);
    if (newOrders.length) setOrders(prev => [...prev, ...newOrders]);
    if (newNotes.length) setOverstockReviewNotes(prev => [...newNotes, ...prev]);
    if (newTimeline.length) setOrderTimeline(prev => [...prev, ...newTimeline]);
    if (resolvedItemIds.length) {
      setInventoryAlertLog(prev => prev.map(a => resolvedItemIds.includes(a.itemId) && !a.acknowledged ? { ...a, acknowledged: true } : a));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory]);

  // M20 — dispatch scheduler (checks current hour each tick; sends queued orders past EOD)
  useEffect(() => {
    const nowHour = new Date().getHours();
    const eod = automationConfig.eodDispatchHour;
    const toDispatch = orders.filter(o => {
      if (o.status !== 'queued') return false;
      const alert = inventoryAlertLog.find(a => a.linkedOrderId === o.id);
      if (alert?.severity === 'critical' && automationConfig.criticalImmediate) return true;
      return nowHour >= eod;
    });
    if (toDispatch.length === 0) return;
    dispatchOrders(toDispatch.map(o => o.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, inventoryAlertLog, automationConfig, tick]);

  // M22 — response-window timeout watcher (per-supplier window)
  useEffect(() => {
    const nowMs = Date.now();
    const expired = orders.filter(o => {
      if (o.status !== 'sent') return false;
      const dispatchEvent = orderTimeline
        .filter(e => e.orderId === o.id && e.kind === 'dispatched')
        .sort((a, b) => b.ts - a.ts)[0];
      if (!dispatchEvent) return false;
      const supplierWindow = suppliers.find(s => s.id === o.supplierId)?.responseWindowHours
        ?? automationConfig.responseWindowHours;
      const windowMs = supplierWindow * 3600_000;
      return nowMs - dispatchEvent.ts > windowMs;
    });
    expired.forEach(o => forceTimeout(o.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, orderTimeline, suppliers, automationConfig, tick]);

  return (
    <ClinicContext.Provider value={{
      payments, financialAudit, cancellationRequests, refundRequests, feeCorrections, expenses,
      createPaymentRequest, confirmCashPayment, verifyBankTransfer, retryOnlinePayment,
      submitCancellationRequest, decideCancellation, decideRefund, confirmCashRefund, createFeeCorrection, resolveOverpayment,
      saveExpense,
      inventory, deductionLog, deductInventory,
      getStockStatus,
      expiryAlertDays, setExpiryAlertDays, isExpiringSoon, isExpired,
      orders, confirmReceived, classifyResponse, cancelOrder,
      suppliers,
      inventoryAlertLog, overstockReviewNotes, acknowledgeAlert, resolveOverstockNote,
      orderDispatchLog, orderTimeline,
      parseSupplierReply,
      automationConfig, setAutomationConfig,
      fireDemoTrigger,
      saveInventoryItem, removeInventoryItem, discardBatch, downloadPurchaseOrder,
    }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error('useClinic must be used inside ClinicProvider');
  return ctx;
}
