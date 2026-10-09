# Plan: Implement Modules 17–23

## Context

The dental clinic system has existing Inventory, Dashboard, and Charting modules with static, disconnected data. The process documentation defines a complete supply chain automation: M17 (stock deduction) → M18 (alerts) → M19 (expiry) → M20 (auto PO) → M22 (order monitoring) → M23 (supplier management), all surfaced in M21 (doctor's dashboard). The goal is to implement these modules coherently by sharing state and updating existing files rather than creating parallel implementations.

---

## Module Summary (for context)

| Module | Name | What it does |
|---|---|---|
| M17 | Supply Inventory Tracking | Auto-deduct stock when supplies are charted; show real-time count; log deductions |
| M18 | Low-Stock / Critical / Overstock Alerts | 3 configurable thresholds per item: Critical (red, qty=0 or near-0), Low/Reorder (yellow), Overstock (blue); auto-triggers M20 ordering |
| M19 | Expiration Date Monitoring | Per-batch expiry tracking with configurable alert window (30–60 days before expiry) |
| M20 | Supply Ordering & Audit | Fully automated PO generation and dispatch at end-of-day; no doctor approval required; routes to supplier via M23; feeds M22 |
| M21 | Doctor's Daily Workflow | Master dashboard: appointments, stock alerts, supplier response statuses, reroute events, "Confirm Received" actions, escalations, income |
| M22 | Order Monitoring | Response-driven order lifecycle: Queued → Sent/Awaiting → Confirmed/Unavailable/No Response/Unclear → Being Delivered → Received/Completed; auto-reroute to backup supplier on fail |
| M23 | Supplier Management | Centralized supplier database; primary + ordered backup chain per item; response windows; performance metrics (response rate, reroute frequency) |

---

## Module Flow

```
Charting (supply used) → M17 deducts stock → M18 checks thresholds →
  Critical/Low → M20 auto-generates PO → M23 routes to supplier →
  M22 tracks supplier response → Being Delivered → Doctor clicks Confirm Received →
  M17 logs receipt → M21 shows full picture at all times
```

---

## Architecture Decision

**Shared React context** (`src/context/ClinicContext.tsx`) to hold inventory, purchase orders, suppliers, and M22 order monitoring state. All four clinic modules read/write from this single context. This replaces the current disconnected static data in each component.

The context exports typed state + dispatchers. Components import via `useClinic()` hook.

---

## Files to Create

### 1. `src/context/ClinicContext.tsx`
Shared state for all supply chain modules:
- `inventory: InventoryItem[]` — with M18 thresholds: `{ criticalThreshold, reorderThreshold, overstockThreshold }`
- `purchaseOrders: Order[]` — unified PO list with M22 lifecycle statuses
- `suppliers: Supplier[]` — M23 supplier records with backup chains
- `deductionLog: DeductionEntry[]` — M17 audit trail
- `expiryAlertDays: number` — M19 configurable window (default 30)

Key types added to `InventoryItem`:
```ts
criticalThreshold: number;   // M18: red alert level
reorderThreshold: number;    // M18: yellow/reorder level (was minThreshold)
overstockThreshold: number;  // M18: blue overstock level
batches: { qty: number; expiry: string; batchNo: string }[];  // M19
supplierId: string;          // M23 link
backupSupplierIds: string[];
```

M22 `Order` type:
```ts
type OrderStatus = 'queued' | 'sent' | 'confirmed' | 'being_delivered' | 
                   'unavailable' | 'no_response' | 'unclear' | 'rerouted' | 
                   'completed' | 'cancelled';
interface Order {
  id, poId, itemId, supplierId, status: OrderStatus,
  supplierResponse?: string, responseClass?: 'confirmed'|'unavailable'|'no_response'|'unclear',
  linkedOrderId?: string,   // reroute chain
  createdAt, updatedAt, confirmedAt, receivedAt
}
```

M23 `Supplier` type:
```ts
interface Supplier {
  id, name, contactPerson, phone, email, address,
  products: string[],  // item IDs supplied
  leadTimeDays: number, responseWindowHours: number,
  paymentTerms: string, status: 'active'|'inactive'|'backup',
  // performance (auto-calculated from M22 data):
  responseRate: number, avgResponseTimeHrs: number, rerounteFrequency: number
}
```

### 2. `src/components/clinic/Suppliers.tsx` (NEW — M23, placeholder)
New top-level view accessible from ClinicApp sidebar. **Rendered as a placeholder** — the full design is TBD, so the view shows the module name, a brief description, and a "Coming Soon" state. The data types (`Supplier`, backup chains, response windows) are still defined in `ClinicContext.tsx` with seed data so that M20, M22, and M21 can reference supplier names and routing logic correctly. The placeholder UI must make clear the connection points: "Routes purchase orders from M20", "Provides backup chains to M22", "Performance data shown in M21 dashboard".

### 3. `src/components/clinic/OrderMonitoring.tsx` (NEW — M22, tab within Inventory view)
Added as a second tab inside Inventory.tsx:
- Order status board with columns for each lifecycle stage
- Per-order: item name, supplier, status badge, timeline
- **Confirm Received** button for `being_delivered` orders (one-click, updates M17 stock)
- Reroute history (linked orders trail)
- Unclear responses flagged for doctor classification (inline radio: Confirmed / Unavailable / Unclear)

---

## Files to Update

### 4. `src/components/clinic/Inventory.tsx` (M17 + M18 + M19 + M20)

**Tab structure**: Add tabs — "Stock" | "Orders" (embeds OrderMonitoring) | "Alerts"

**Stock tab** (M17 + M18 + M19):
- Replace `minThreshold` display with 3-threshold system: Critical / Reorder / Overstock
- M18 status badges: `CRITICAL` (red), `LOW` (yellow), `OVERSTOCK` (blue), `OK` (green)
- M19: Show expiry per batch; badge `EXPIRING` (within alert window) or `EXPIRED`
- Deduction log drawer: show last N deductions triggered by Charting

**Orders tab** (M20 + M22):
- Embeds `<OrderMonitoring />` 
- "Auto-dispatch" toggle with time setting (end-of-day default)
- Shows pending queued POs before dispatch

**Alerts tab** (M18 aggregated):
- All current critical/low/overstock/expiring items in one feed
- Each alert has action: "Order Now" (triggers M20 manual PO) or "Review"

**Remove**: Doctor approval flow — M20 spec says no doctor approval is needed; orders auto-dispatch.

### 5. `src/components/clinic/Dashboard.tsx` (M21)

Add new sections to existing layout:

**Supplier Response Status** panel (new, replaces/extends Pending PO Approvals):
- Shows orders currently in `sent`, `unclear`, `being_delivered` status
- Per-order: supplier name, item, status badge, time elapsed
- Inline "Confirm Received" button for `being_delivered`
- Inline response classification for `unclear` (Confirmed / Unavailable buttons)

**Reroute Events** panel (new):
- Recent automatic reroutes (last 5)
- Per event: original supplier, backup supplier, reason (Unavailable/No Response), item name
- Link to full order in Inventory > Orders tab

**Escalations** panel (new):
- Orders where full backup chain is exhausted — needs doctor manual action (cancel or contact supplier directly)

**Stats row**: update "Pending PO Approvals" card → "Active Orders" (count of non-completed orders)

**Keep**: Today's Schedule, Medical Alerts, Daily Income — unchanged structure.

### 6. `src/components/clinic/Charting.tsx` (M17)

The existing Charting already has a `supplyUsed` list; add:
- On `handleSaveNote` (or equivalent save action), call context's `deductInventory(itemId, qty, patientId, date)` 
- Display current stock count next to each supply item in the tray
- Show warning if stock would go to critical after deduction

### 7. `src/components/ClinicApp.tsx`

- Add `'suppliers'` to `View` type
- Add "Suppliers" nav item with an appropriate icon (e.g., `IconBuilding` or `IconTruck`)
- Wrap the clinic app children in `<ClinicProvider>` so all components share state
- Route `view === 'suppliers'` → `<Suppliers />`

---

## Implementation Order

1. Create `ClinicContext.tsx` with seed data (migrate existing Inventory + Dashboard hardcoded data into it)
2. Update `ClinicApp.tsx` to add provider + Suppliers nav item
3. Update `Inventory.tsx` to read from context, add 3-threshold M18, M19 batches, tabs
4. Create `Suppliers.tsx` (M23)
5. Create `OrderMonitoring.tsx` (M22) and embed in Inventory Orders tab
6. Update `Dashboard.tsx` to show M21 supplier/order panels
7. Update `Charting.tsx` to deduct from context (M17 complete)

---

## Verification

- Navigate to Inventory → Stock tab: items show Critical/Low/Overstock badges correctly
- Navigate to Inventory → Alerts tab: aggregated alert feed visible
- Navigate to Suppliers: list shows with backup chain configurator
- Navigate to Inventory → Orders: orders show lifecycle statuses; "Confirm Received" updates stock
- Dashboard shows supplier response statuses and reroute events
- Charting supplies panel shows live stock counts; saving a note deducts from context
- TypeScript: `npx tsc --noEmit` should pass
