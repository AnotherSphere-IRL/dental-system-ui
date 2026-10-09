# Plan: Implement Modules 17–23 (Supply Inventory, Alerts, Expiration, Ordering, Operations Dashboard, Order Monitoring, Supplier Management)

## Context

The PDF attachment documents four new modules for Premier Dental Solutions PH — all under the "Inventory, Supplies & Operations" department. They form an integrated chain: Module 17 tracks live stock → Module 18 monitors thresholds and fires alerts → Module 19 tracks batch expiration → Module 20 auto-dispatches purchase orders when thresholds are breached (no doctor approval required). 

The existing `Inventory.tsx` partially implements Module 17 but conflates it with Module 20 (it has a "Doctor Approve & Submit" button which directly contradicts Module 20's fully-automatic ordering model). It needs to be replaced with a correctly-scoped, tabbed implementation.

`ClinicApp.tsx` already has `'inventory'` in its `View` type but the nav item is not wired — it falls through to `PlaceholderView`. This plan wires it up.

---

## Module Summary

| Module | Name | Key features |
|--------|------|---|
| 17 | Supply Inventory Tracking | Master supply list, real-time qty, auto-deduction from charting, deduction history log |
| 18 | Stock Alert Process | Three-tier thresholds per item: Critical Low (red/urgent), Low/Reorder (yellow), Overstock (blue/suppress). Auto-triggers Module 20 for Critical/Low |
| 19 | Expiration Date Monitoring | Per-batch expiry dates, configurable alert window (days before expiry), expiry alerts on dashboard |
| 20 | Supply Ordering & Audit | Fully automatic PO drafting + dispatch (end-of-day batch or immediate for Critical Low). No approval button. Audit trail, order history, supplier routing |
| 21 | Admin & Operations Dashboard | Aggregates Modules 17–20: live stock KPIs, active alerts by severity, expiry warnings, pending order status, overstock review notes. Doctor's single-pane view |
| 22 | Order Monitoring | Full order lifecycle tracking: Queued → Sent → Confirmed → Delivered / Exception. Per-order status, ETA, exception alerts (email bounce etc.) |
| 23 | Supplier Management | Master supplier list: primary/backup per item, rep, email, phone, lead time, payment terms, performance score fed back from Module 20 |

---

## What to Build

### 1. Rewrite `src/components/clinic/Inventory.tsx`

Replace the existing file with a four-tab component. Each tab = one module:

**Tab "Stock" (Module 17)**
- Master supply list table: item name, category, qty/unit, Critical Low / Reorder / Overstock thresholds, expiry, supplier
- Each row shows a color-coded stock status pill (Critical/Low/Overstock/OK)
- Deduction History panel below: log of charting-triggered auto-deductions (item, qty deducted, procedure, date)
- "Add Item" button opens an inline form

**Tab "Alerts" (Module 18)**
- Alert center showing all currently-flagged items, grouped by severity: Critical Low (red), Low/Reorder (yellow), Overstock (blue)
- Threshold configuration table per item: set Critical Low, Reorder, Overstock/Max values
- Each alert shows: item name, current qty, threshold breached, auto-action (e.g., "Order queued for end-of-day dispatch")
- Overstock items show "Ordering suppressed · Review note logged"
- "Highest severity wins" note: Critical > Low > Overstock

**Tab "Expiry" (Module 19)**
- Batch expiry table: item, batch ID, expiry date, days remaining, status badge (Expired/Critical/Warning/OK)
- Alert window config (default 60 days)
- Items expiring within alert window are highlighted; expired items shown in red
- Summary count cards at top: Expired, Expiring Soon, OK

**Tab "Orders" (Module 20)**
- Auto-sent PO log: PO#, supplier, items, total, trigger (Critical Low / Low), dispatch time, status (Queued / Sent / Delivered / Exception)
- No doctor approval button — all orders are system-dispatched
- Audit trail table: timestamp, action, actor (System/Doctor), result
- Overstock suppression log entries
- Exception alerts (e.g., email bounce) shown as red rows

Data: Seed with realistic sample data consistent with the existing INITIAL_INVENTORY items.

### 2. Create `src/components/clinic/OperationsDashboard.tsx` (Module 21)

Module 21 is the aggregating "Admin & Operations Dashboard" — a new dedicated sidebar section separate from the existing clinical Dashboard (which focuses on patient appointments). It surfaces the outputs of Modules 17–20 in one view:

- **KPI row** (4 tiles): Total Stock Items / Low+Critical Items / Expiring Within 60 Days / Orders Dispatched Today
- **Active Alerts panel** (grouped by severity, highest first): Critical Low (red), Low/Reorder (yellow), Overstock (blue), Expiry alerts (orange). Each row shows item, qty, threshold breached, auto-action status.
- **Overstock Review Notes**: list of overstock-flagged items with "ordering suppressed" note for doctor review
- **Recent Orders panel**: last 5 auto-dispatched POs with supplier, total, status
- **Expiry Warnings panel**: items expiring within alert window, days remaining

### 3. Create `src/components/clinic/OrderMonitoring.tsx` (Module 22)

Full order lifecycle view. Separate from the Orders tab inside Inventory (which shows the audit trail from Module 20's perspective). This is Module 22's status-tracking perspective:

- Order list with status timeline steps: Queued → Sent → Supplier Confirmed → In Transit → Delivered / Exception
- Each order row expandable: items, supplier, PO#, dispatch time, expected delivery date, current status
- Exception alerts (email bounce, supplier unavailable, overdue) shown as red rows
- Filter by status (All / Active / Delivered / Exception)

### 4. Create `src/components/clinic/SupplierManagement.tsx` (Module 23)

Master supplier registry used by Module 20 for auto-routing:

- Supplier table: name, rep, email, phone, lead time (days), payment terms, performance score (%, fed back from Module 20)
- Per-supplier: list of items routed to them
- Primary/backup mapping table: for each inventory item, which is the primary supplier and which is backup (activated automatically when primary is unavailable)
- Performance scores: on-time delivery %, order accuracy %, last order date

### 5. Update `src/components/ClinicApp.tsx`

- Extend `View` type to add: `'operations' | 'order-monitoring' | 'suppliers'`
- Import `Inventory`, `OperationsDashboard`, `OrderMonitoring`, `SupplierManagement`
- Add nav items to `NAV_ITEMS`:
  - `{ id: 'inventory', label: 'Inventory', Icon: IconPackage }`
  - `{ id: 'operations', label: 'Operations', Icon: IconBarChart }`  ← Module 21
  - `{ id: 'order-monitoring', label: 'Orders', Icon: IconTruck }` ← Module 22
  - `{ id: 'suppliers', label: 'Suppliers', Icon: IconUsers }` — reuse existing icon ← Module 23
- Add render conditions for the four new views
- Remove `'inventory'` from `PlaceholderView` condition; keep `'reports'` and `'settings'` there

### 6. Add icons to `src/components/icons.tsx`

- `IconTruck` — for order/delivery status (Module 22 nav + order rows)

---

## Critical Files

- `src/components/clinic/Inventory.tsx` — full rewrite (Modules 17–20 tabs)
- `src/components/clinic/OperationsDashboard.tsx` — new file (Module 21)
- `src/components/clinic/OrderMonitoring.tsx` — new file (Module 22)
- `src/components/clinic/SupplierManagement.tsx` — new file (Module 23)
- `src/components/ClinicApp.tsx` — extend View type, add 4 nav items, add render conditions
- `src/components/icons.tsx` — add `IconTruck`

## Reuse

- All existing inventory items from `INITIAL_INVENTORY` in current `Inventory.tsx` as seed data
- Existing `StockBadge`, `POStatusBadge` helper components — keep and extend
- Existing icon set: `IconAlert`, `IconPackage`, `IconCheck`, `IconLoader`, `IconPlus`, `IconFileText`, `IconBarChart`
- Same Tailwind CSS v4 token conventions: `bg-clinical-*`, `text-primary-*`, `bg-alert-*`, `bg-success-*`
- Three-threshold model: `criticalLow`, `reorderLevel`, `overstockMax` — extending existing `minThreshold` field
- Shared supplier seed data between `SupplierManagement.tsx` and `Inventory.tsx` Orders tab

## Verification

1. Sidebar shows 4 new nav items: Inventory, Operations, Orders, Suppliers
2. Inventory → 4 tabs (Stock / Alerts / Expiry / Orders) all render with sample data
3. Alerts tab shows Critical Low items in red, Low in yellow, Overstock in blue with suppress note; no approval buttons
4. Operations dashboard shows aggregated KPIs + active alerts from all modules
5. Orders (Module 22) shows order lifecycle timeline with at least one Exception row
6. Suppliers shows master supplier list + primary/backup mapping + performance scores
7. No TypeScript errors
