import { useRef, useState } from 'react';
import {
  IconPlus, IconCheck, IconX, IconAlert,
  IconLoader, IconUpload, IconUser,
  IconDownload, IconFileText, IconReceipt, IconLock, IconSearch, IconChevronDown,
} from '../icons';
import {
  useClinic,
  type PaymentTransaction,
  type PaymentStatus,
  type RefundRequest,
  type CancellationRequest,
  type ExpenseCategory,
} from '../../context/ClinicContext';
import { useServiceCatalog, type ServiceRecord, type ServiceStatus } from '../../context/ServiceCatalogContext';

interface OverdueAccount {
  reference: string;
  patientId: string; patient: string; amount: number;
  dueDate: string; daysOverdue: number; lastReminder: string | null;
  reminderSent: boolean; nextReminderHours?: number;
}
/* ══════════════════════════════════════════════════════════
   SHARED UI ATOMS
══════════════════════════════════════════════════════════ */

function SectionHeader({ title, subtitle, badge, action }: {
  title: string; subtitle?: string;
  badge?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-clinical-900 font-display">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-clinical-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function RbacBadge({ label = 'Doctor / Owner Only' }: { label?: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-alert-50 text-alert-700 border border-alert-100">
      <IconLock className="w-3 h-3" /> {label}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-success-50 text-success-700 border-success-100',
    paid: 'bg-success-50 text-success-700 border-success-100',
    refunded: 'bg-success-50 text-success-700 border-success-100',
    processing: 'bg-primary-50 text-primary-700 border-primary-100',
    awaiting_cash: 'bg-warning-50 text-warning-700 border-warning-100',
    for_verification: 'bg-warning-50 text-warning-700 border-warning-100',
    pending: 'bg-warning-50 text-warning-700 border-warning-100',
    failed: 'bg-alert-50 text-alert-700 border-alert-100',
    approved: 'bg-success-50 text-success-700 border-success-100',
    rejected: 'bg-alert-50 text-alert-700 border-alert-100',
    overdue: 'bg-alert-50 text-alert-700 border-alert-100',
    'due-today': 'bg-warning-50 text-warning-700 border-warning-100',
  };
  const labels: Record<string, string> = {
    completed: 'Completed', pending: 'Pending', failed: 'Failed',
    paid: 'Paid / Completed', processing: 'Processing', for_verification: 'For Verification',
    awaiting_cash: 'Approved – Awaiting Cash Refund',
    refunded: 'Refunded / Completed',
    approved: 'Approved', rejected: 'Rejected',
    overdue: 'Overdue', 'due-today': 'Due Today',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${map[status] ?? 'bg-clinical-100 text-clinical-600 border-clinical-200'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function AuditRow({ ts, user, action, detail }: { ts: string; user: string; action: string; detail?: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 text-xs border-b border-clinical-50 last:border-0">
      <span className="font-mono text-[10px] text-clinical-400 shrink-0 pt-0.5">{ts}</span>
      <span className="text-clinical-500 shrink-0">{user}</span>
      <span className="text-clinical-700 font-medium">{action}</span>
      {detail && <span className="text-clinical-400 truncate">{detail}</span>}
    </div>
  );
}

function AuditPanel({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  // Audit trails start open so recent activity is visible, while keeping dense sections collapsible.
  const [visible, setVisible] = useState(true);
  return (
    <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
      <button onClick={() => setVisible(current => !current)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-clinical-700 hover:bg-clinical-50 transition-colors">
        <span className="flex items-center gap-2"><IconFileText className="w-4 h-4" /> {title}</span>
        <span className="text-clinical-400">{visible ? '▲ Hide' : '▼ Show'} ({count} entries)</span>
      </button>
      {visible && (
        <div className="border-t border-clinical-100 max-h-48 overflow-y-auto divide-y divide-clinical-50">
          {children}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon?: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      {icon ?? <IconFileText className="w-10 h-10 text-clinical-200 mb-3" />}
      <p className="text-sm font-medium text-clinical-500">{title}</p>
      {sub && <p className="text-xs text-clinical-400 mt-1">{sub}</p>}
    </div>
  );
}

function php(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

type SortDirection = 'asc' | 'desc';

function SortableHeader({
  label,
  active,
  direction,
  onSort,
  align = 'left',
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onSort: () => void;
  align?: 'left' | 'right';
}) {
  return (
    <button
      onClick={onSort}
      className={`inline-flex w-full items-center gap-1 font-semibold text-clinical-600 hover:text-clinical-900 ${align === 'right' ? 'justify-end' : 'justify-start'}`}
    >
      {label}
      <IconChevronDown className={`h-3 w-3 transition-transform ${active && direction === 'asc' ? 'rotate-180' : ''} ${active ? 'text-primary-700' : 'text-clinical-300'}`} />
    </button>
  );
}

/* ══════════════════════════════════════════════════════════
   MODULE 1 — SERVICE PRICE LIST MANAGEMENT
══════════════════════════════════════════════════════════ */

function PriceListModule() {
  const {
    masterServices: services,
    categories,
    audit,
    hasUnpublishedChanges,
    saveService,
    addCategory,
    removeCategory,
    publishCatalog,
  } = useServiceCatalog();
  const [filterCat, setFilterCat] = useState('All');
  const [serviceQuery, setServiceQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<ServiceRecord | null>(null);
  const [selectingEdit, setSelectingEdit] = useState(false);
  const [serviceSort, setServiceSort] = useState<{ key: 'code' | 'category' | 'name' | 'price' | 'effectiveDate' | 'status'; direction: SortDirection }>({ key: 'code', direction: 'asc' });
  const [publishing, setPublishing] = useState(false);
  const [form, setForm] = useState({
    code: '',
    category: 'Preventive',
    name: '',
    description: '',
    inclusions: '',
    price: '',
    newPrice: '',
    effectiveDate: '2026-09-24',
    status: 'active' as ServiceStatus,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const filtered = services.filter(service => {
    const matchesCategory = filterCat === 'All' || service.category === filterCat;
    const matchesQuery = `${service.code} ${service.name}`.toLowerCase().includes(serviceQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });
  const sortedServices = [...filtered].sort((a, b) => {
    const left = a[serviceSort.key];
    const right = b[serviceSort.key];
    const result = typeof left === 'number'
      ? left - (right as number)
      : String(left).localeCompare(String(right));
    return serviceSort.direction === 'asc' ? result : -result;
  });
  const sortServices = (key: typeof serviceSort.key) => {
    setServiceSort(current => current.key === key
      ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' });
  };

  const exportPriceList = () => {
    const rows = [
      ['Service Code', 'Service Name', 'Category', 'Base Price', 'Status', 'Effective Date'],
      ...services.map(service => [service.code, service.name, service.category, String(service.price), service.status, service.effectiveDate]),
    ];
    const blob = new Blob([rows.map(row => row.map(value => `"${value}"`).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'service-price-list.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const openAdd = () => {
    setSelectingEdit(false);
    setEditItem(null);
    setForm({ code: '', category: categories[0] ?? 'Preventive', name: '', description: '', inclusions: '', price: '', newPrice: '', effectiveDate: '2026-09-24', status: 'active' });
    setShowForm(true);
    setSaved(false);
  };
  const openEdit = (s: ServiceRecord) => {
    setSelectingEdit(false);
    setEditItem(s);
    setForm({ code: s.code, category: s.category, name: s.name, description: s.description, inclusions: s.inclusions.join(', '), price: String(s.price), newPrice: s.scheduledPrice ? String(s.scheduledPrice) : '', effectiveDate: s.scheduledEffectiveDate ?? s.effectiveDate, status: s.status });
    setShowForm(true);
    setSaved(false);
  };

  const handleAddCategory = () => {
    const category = newCategory.trim();
    if (!category || categories.includes(category)) return;
    addCategory(category);
    setForm(p => ({ ...p, category }));
    setNewCategory('');
    setShowCategoryForm(false);
  };

  const requestCategoryDeletion = (category: string) => {
    const assignedServices = services.filter(service => service.category === category).length;
    if (assignedServices > 0) {
      setCategoryError(`“${category}” cannot be deleted because ${assignedServices} existing service${assignedServices === 1 ? ' uses' : 's use'} it. Reassign those services first.`);
      return;
    }
    setCategoryError('');
    setCategoryToDelete(category);
  };

  const confirmCategoryDeletion = () => {
    if (!categoryToDelete) return;
    removeCategory(categoryToDelete);
    if (filterCat === categoryToDelete) setFilterCat('All');
    if (form.category === categoryToDelete) setForm(current => ({ ...current, category: categories.find(category => category !== categoryToDelete) ?? '' }));
    setCategoryToDelete(null);
  };

  const handleSave = () => {
    if (!form.code || !form.name || !form.description || !form.price || !form.effectiveDate) return;
    setSaving(true);
    setTimeout(() => {
      saveService({
        id: editItem?.id ?? `s${Date.now()}`,
        code: form.code.trim().toUpperCase(),
        category: form.category,
        name: form.name.trim(),
        description: form.description.trim(),
        inclusions: form.inclusions.split(',').map(item => item.trim()).filter(Boolean),
        price: editItem?.price ?? Number(form.price),
        effectiveDate: editItem?.effectiveDate ?? form.effectiveDate,
        status: form.status,
        scheduledPrice: editItem && form.newPrice ? Number(form.newPrice) : undefined,
        scheduledEffectiveDate: editItem && form.newPrice ? form.effectiveDate : undefined,
      });
      setSaving(false); setSaved(true);
      setTimeout(() => { setShowForm(false); setSaved(false); }, 800);
    }, 700);
  };

  const handlePublish = () => {
    setPublishing(true);
    setTimeout(() => {
      publishCatalog();
      setPublishing(false);
    }, 1000);
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Service Price List Management"
        subtitle="Master reference for service categories, names, prices, and effective dates. Edits restricted to authorized users."
        badge={<RbacBadge />}
        action={
          <div className="flex gap-2">
            <button onClick={exportPriceList}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-clinical-200 text-clinical-700 bg-white rounded-lg hover:bg-clinical-50 transition-colors">
              <IconDownload className="w-3.5 h-3.5" /> Export
            </button>
            <button onClick={handlePublish} disabled={publishing || !hasUnpublishedChanges}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-primary-300 text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 disabled:opacity-60 transition-colors">
              {publishing ? <IconLoader className="w-3.5 h-3.5" /> : <IconCheck className="w-3.5 h-3.5" />}
              {!hasUnpublishedChanges ? 'Published' : 'Publish Price List'}
            </button>
            <button onClick={() => setShowCategoryForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-clinical-200 text-clinical-700 bg-white rounded-lg hover:border-primary-300 transition-colors">
              <IconPlus className="w-3.5 h-3.5" /> New Category
            </button>
            <button
              onClick={() => setSelectingEdit(current => !current)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg transition-colors ${
                selectingEdit
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-clinical-200 bg-white text-clinical-700 hover:border-primary-300'
              }`}
            >
              <IconFileText className="w-3.5 h-3.5" /> {selectingEdit ? 'Cancel Edit Selection' : 'Edit Service'}
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 text-white text-xs font-semibold rounded-lg hover:bg-primary-800 transition-colors">
              <IconPlus className="w-3.5 h-3.5" /> Add New Service
            </button>
          </div>
        }
      />

      {hasUnpublishedChanges && (
        <div className="flex items-center gap-2 p-3 bg-warning-50 border border-warning-200 rounded-xl text-xs text-warning-700">
          <IconAlert className="w-4 h-4 shrink-0" />
          <span><strong>Validated changes are not yet published.</strong> Publish to update the patient-facing Service Catalog.</span>
        </div>
      )}

      {selectingEdit && (
        <div className="flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 p-3 text-xs font-medium text-primary-700">
          <IconFileText className="h-4 w-4 shrink-0" />
          Select a service row below to open its consolidated edit view.
        </div>
      )}

      {showCategoryForm && (
        <div className="flex items-end gap-2 p-3 bg-white border border-clinical-200 rounded-xl">
          <div className="flex-1">
            <label className="block text-xs font-medium text-clinical-700 mb-1">New Service Category</label>
            <input value={newCategory} onChange={e => setNewCategory(e.target.value)}
              placeholder="Enter category name"
              className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <button onClick={handleAddCategory} disabled={!newCategory.trim()}
            className="px-4 py-2 bg-primary-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50">Add Category</button>
          <button onClick={() => { setShowCategoryForm(false); setNewCategory(''); }}
            className="px-3 py-2 text-xs text-clinical-500">Cancel</button>
        </div>
      )}

      {categoryError && (
        <div className="flex items-start justify-between gap-3 p-3 bg-alert-50 border border-alert-200 rounded-xl text-xs text-alert-700" role="alert">
          <span className="flex items-start gap-2"><IconAlert className="w-4 h-4 shrink-0" />{categoryError}</span>
          <button onClick={() => setCategoryError('')} className="font-semibold">Dismiss</button>
        </div>
      )}

      {/* Category filter */}
      <div className="relative max-w-md">
        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clinical-400" />
        <input value={serviceQuery} onChange={event => setServiceQuery(event.target.value)}
          placeholder="Search by service name or code..."
          className="w-full rounded-full border border-clinical-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setFilterCat('All')}
          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
            filterCat === 'All' ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-clinical-600 border-clinical-200 hover:border-primary-400'
          }`}>All</button>
        {categories.map(category => (
          <div key={category} className={`flex items-center rounded-full border overflow-hidden ${
            filterCat === category ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-clinical-600 border-clinical-200'
          }`}>
            <button onClick={() => setFilterCat(category)} className="pl-3 pr-2 py-1 text-xs font-medium">{category}</button>
            <button onClick={() => requestCategoryDeletion(category)} aria-label={`Delete ${category} category`} title={`Delete ${category} category`} className="pr-2 py-1 opacity-70 hover:opacity-100">
              <IconX className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Service table */}
      <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-clinical-100 bg-clinical-50">
              <th className="px-4 py-2.5"><SortableHeader label="Service Code" active={serviceSort.key === 'code'} direction={serviceSort.direction} onSort={() => sortServices('code')} /></th>
              <th className="px-4 py-2.5"><SortableHeader label="Category" active={serviceSort.key === 'category'} direction={serviceSort.direction} onSort={() => sortServices('category')} /></th>
              <th className="px-4 py-2.5"><SortableHeader label="Service Name" active={serviceSort.key === 'name'} direction={serviceSort.direction} onSort={() => sortServices('name')} /></th>
              <th className="px-4 py-2.5"><SortableHeader label="Base Price" active={serviceSort.key === 'price'} direction={serviceSort.direction} onSort={() => sortServices('price')} align="right" /></th>
              <th className="px-4 py-2.5"><SortableHeader label="Effective Date" active={serviceSort.key === 'effectiveDate'} direction={serviceSort.direction} onSort={() => sortServices('effectiveDate')} /></th>
              <th className="px-4 py-2.5"><SortableHeader label="Service Status" active={serviceSort.key === 'status'} direction={serviceSort.direction} onSort={() => sortServices('status')} /></th>
              <th className="px-4 py-2.5 text-right font-semibold text-clinical-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-clinical-50">
            {sortedServices.map(s => (
              <tr
                key={s.id}
                onClick={() => selectingEdit && openEdit(s)}
                className={`transition-colors ${selectingEdit ? 'cursor-pointer hover:bg-primary-50' : 'hover:bg-clinical-50'}`}
              >
                <td className="px-4 py-2.5 font-mono text-[10px] text-clinical-500">{s.code}</td>
                <td className="px-4 py-2.5">
                  <span className="text-[10px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">{s.category}</span>
                </td>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-clinical-800">{s.name}</p>
                  <p className="mt-0.5 max-w-xs truncate text-[10px] text-clinical-400">{s.description}</p>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <p className="font-semibold text-clinical-900 tabular-nums">{php(s.price)}</p>
                  {s.scheduledPrice && (
                    <p className="mt-0.5 text-[10px] font-medium text-warning-700">
                      {php(s.scheduledPrice)} on {s.scheduledEffectiveDate}
                    </p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-clinical-500">{s.effectiveDate}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.status === 'active' ? 'border-success-100 bg-success-50 text-success-700' : 'border-clinical-200 bg-clinical-100 text-clinical-600'}`}>
                    {s.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={event => { event.stopPropagation(); saveService({ ...s, status: s.status === 'active' ? 'inactive' : 'active' }); }} className={`min-w-20 rounded-lg px-3 py-1.5 text-[10px] font-semibold ${s.status === 'active' ? 'bg-clinical-100 text-clinical-700 hover:bg-clinical-200' : 'bg-success-50 text-success-700 hover:bg-success-100'}`}>
                      {s.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-clinical-600">No services in this category</p>
                  <p className="mt-1 text-xs text-clinical-400">Add a service or choose another category.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="max-h-screen w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 m-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-clinical-900">{editItem ? 'Edit Service' : 'Add Service'}</h3>
              <button onClick={() => setShowForm(false)} className="text-clinical-400 hover:text-clinical-700"><IconX className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <p className="border-b border-clinical-100 pb-2 text-xs font-bold uppercase tracking-wider text-clinical-400">Basic service information</p>
              <div>
                <label className="block text-xs font-medium text-clinical-700 mb-1">Service Code</label>
                <input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                  placeholder="e.g. DEN-RES-010"
                  className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-clinical-700 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-clinical-700 mb-1">Service Name</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Composite Restoration (1 surface)"
                  className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-clinical-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3} placeholder="Patient-facing service description"
                  className="w-full resize-none text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-clinical-700 mb-1">Inclusions</label>
                <input value={form.inclusions} onChange={e => setForm(p => ({ ...p, inclusions: e.target.value }))}
                  placeholder="Separate inclusions with commas"
                  className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <p className="border-b border-clinical-100 pb-2 pt-2 text-xs font-bold uppercase tracking-wider text-clinical-400">Pricing and availability</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-clinical-700 mb-1">{editItem ? 'Current Base Price (₱)' : 'Base Price (₱)'}</label>
                <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  placeholder="0.00" min="0" disabled={Boolean(editItem)}
                  className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-clinical-100 disabled:text-clinical-500" />
              </div>
              {editItem && (
                <div>
                  <label className="block text-xs font-medium text-clinical-700 mb-1">New Price (₱) <span className="font-normal text-clinical-400">Optional</span></label>
                  <input type="number" value={form.newPrice} onChange={e => setForm(p => ({ ...p, newPrice: e.target.value }))}
                    placeholder="Enter a scheduled replacement price" min="0"
                    className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  {form.newPrice && <p className="mt-1 text-[10px] text-warning-700">The current price remains active until the effective date.</p>}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-clinical-700 mb-1">{editItem && form.newPrice ? 'New Price Effective Date' : 'Effective Date'}</label>
                <input type="date" value={form.effectiveDate} onChange={e => setForm(p => ({ ...p, effectiveDate: e.target.value }))}
                  className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-clinical-700 mb-1">Service Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as ServiceStatus }))}
                  className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-clinical-200 text-xs font-semibold text-clinical-700 rounded-lg hover:bg-clinical-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.code || !form.name || !form.description || !form.price || !form.effectiveDate}
                className="flex-1 py-2 bg-primary-700 text-white text-xs font-semibold rounded-lg hover:bg-primary-800 disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving ? <IconLoader className="w-3.5 h-3.5" /> : saved ? <><IconCheck className="w-3.5 h-3.5" /> Saved!</> : 'Save & Validate'}
              </button>
            </div>
            {editItem && (
              <p className="mt-2 text-[10px] text-clinical-400 text-center">
                Change will be recorded in Price Update Audit Log.
              </p>
            )}
          </div>
        </div>
      )}

      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
            <h3 className="text-sm font-semibold text-clinical-900">Delete category?</h3>
            <p className="text-xs text-clinical-500 mt-2">Delete “{categoryToDelete}” from the service price list? This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setCategoryToDelete(null)} className="px-4 py-2 border border-clinical-200 text-xs font-semibold text-clinical-700 rounded-lg">Cancel</button>
              <button onClick={confirmCategoryDeletion} className="px-4 py-2 bg-alert-600 text-white text-xs font-semibold rounded-lg">Delete Category</button>
            </div>
          </div>
        </div>
      )}

      <AuditPanel title="Price Update Audit Log" count={audit.length}>
        {audit.map(e => (
          <AuditRow key={e.id} ts={e.timestamp} user={e.user} action={e.action}
            detail={`${e.service} · ${e.detail}`}
          />
        ))}
      </AuditPanel>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODULE 2 — PAYMENT PROCESSING MANAGEMENT
══════════════════════════════════════════════════════════ */

function paymentActionLabel(payment: PaymentTransaction) {
  if (payment.method === 'Cash' && payment.status === 'pending') return 'Confirm Payment';
  return 'View';
}

function PaymentProcessingModule() {
  const { payments, financialAudit, confirmCashPayment, retryOnlinePayment } = useClinic();
  const [selected, setSelected] = useState<PaymentTransaction | null>(null);
  const [paymentSort, setPaymentSort] = useState<{ key: 'reference' | 'patient' | 'service' | 'amountDue' | 'method' | 'status'; direction: SortDirection }>({ key: 'reference', direction: 'desc' });

  const latestSelected = selected ? payments.find(payment => payment.reference === selected.reference) ?? selected : null;
  const sortedPayments = [...payments].sort((a, b) => {
    const left = a[paymentSort.key];
    const right = b[paymentSort.key];
    const result = typeof left === 'number'
      ? left - (right as number)
      : String(left).localeCompare(String(right));
    return paymentSort.direction === 'asc' ? result : -result;
  });
  const sortPayments = (key: typeof paymentSort.key) => {
    setPaymentSort(current => current.key === key
      ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' });
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Payment Requests"
        subtitle="Patient-initiated requests appear here automatically. Staff confirms cash and verifies bank transfers; online providers update their own results."
        badge={<RbacBadge label="Review & Verification Workspace" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { label: 'Pending', value: payments.filter(payment => payment.status === 'pending').length, style: 'bg-warning-50 text-warning-700 border-warning-100' },
          { label: 'Processing', value: payments.filter(payment => payment.status === 'processing').length, style: 'bg-primary-50 text-primary-700 border-primary-100' },
          { label: 'Paid', value: payments.filter(payment => payment.status === 'paid').length, style: 'bg-success-50 text-success-700 border-success-100' },
          { label: 'Failed', value: payments.filter(payment => payment.status === 'failed').length, style: 'bg-alert-50 text-alert-700 border-alert-100' },
        ]).map(item => (
          <div key={item.label} className={`rounded-xl border p-3 ${item.style}`}>
            <p className="text-xl font-bold">{item.value}</p>
            <p className="text-[10px] font-semibold mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-clinical-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-clinical-700">Incoming Payment Requests</p>
          <span className="text-[10px] text-clinical-400">Synced from Patient Portal · {payments.length} requests</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-clinical-50 bg-clinical-50">
              <th className="px-4 py-2"><SortableHeader label="Reference" active={paymentSort.key === 'reference'} direction={paymentSort.direction} onSort={() => sortPayments('reference')} /></th>
              <th className="px-4 py-2"><SortableHeader label="Patient" active={paymentSort.key === 'patient'} direction={paymentSort.direction} onSort={() => sortPayments('patient')} /></th>
              <th className="px-4 py-2"><SortableHeader label="Service" active={paymentSort.key === 'service'} direction={paymentSort.direction} onSort={() => sortPayments('service')} /></th>
              <th className="px-4 py-2"><SortableHeader label="Amount" active={paymentSort.key === 'amountDue'} direction={paymentSort.direction} onSort={() => sortPayments('amountDue')} align="right" /></th>
              <th className="px-4 py-2"><SortableHeader label="Method" active={paymentSort.key === 'method'} direction={paymentSort.direction} onSort={() => sortPayments('method')} /></th>
              <th className="px-4 py-2"><SortableHeader label="Status" active={paymentSort.key === 'status'} direction={paymentSort.direction} onSort={() => sortPayments('status')} /></th>
              <th className="px-4 py-2 text-right font-semibold text-clinical-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-clinical-50">
            {sortedPayments.map(payment => (
              <tr key={payment.reference} className="hover:bg-clinical-50">
                <td className="px-4 py-2.5 font-mono text-[10px] text-clinical-500">{payment.reference}</td>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-clinical-800">{payment.patient}</p>
                  <p className="text-[10px] text-clinical-400">{payment.patientId}</p>
                </td>
                <td className="px-4 py-2.5 text-clinical-600">{payment.service}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-clinical-900">{php(payment.amountDue)}</td>
                <td className="px-4 py-2.5 text-clinical-600">{payment.method}</td>
                <td className="px-4 py-2.5"><StatusPill status={payment.status} /></td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => setSelected(payment)}
                    className="inline-flex w-28 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 px-3 py-1.5 text-[10px] font-semibold text-primary-700 hover:bg-primary-100">
                    {paymentActionLabel(payment)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {latestSelected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-clinical-900">
                  {latestSelected.method === 'Cash' && latestSelected.status === 'pending' ? 'Confirm Cash Payment' : 'Payment Details'}
                </h3>
                <p className="text-[10px] font-mono text-clinical-400 mt-0.5">{latestSelected.reference}</p>
              </div>
              <button onClick={() => setSelected(null)}><IconX className="w-5 h-5 text-clinical-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Patient', latestSelected.patient],
                ['Patient ID', latestSelected.patientId],
                ['Appointment', latestSelected.appointmentId],
                ['Service', latestSelected.service],
                ['Amount', php(latestSelected.amountDue)],
                ['Method', latestSelected.method],
              ].map(([label, value]) => (
                <div key={label} className="bg-clinical-50 border border-clinical-100 rounded-lg p-2.5">
                  <p className="text-[10px] text-clinical-400">{label}</p>
                  <p className="font-medium text-clinical-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between p-3 bg-clinical-50 rounded-xl">
              <span className="text-xs text-clinical-500">Current status</span>
              <StatusPill status={latestSelected.status} />
            </div>
            {latestSelected.proofFile && (
              <div className="mt-3 flex items-center gap-2 text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-lg p-3">
                <IconFileText className="w-4 h-4" /> Transfer proof: {latestSelected.proofFile}
              </div>
            )}
            {latestSelected.method === 'Cash' && latestSelected.status === 'pending' && (
              <p className="mt-3 text-xs text-clinical-600">Confirm only after receiving the exact cash amount at the clinic desk.</p>
            )}
            {latestSelected.status === 'failed' && (
              <p className="mt-3 text-xs text-alert-700 bg-alert-50 border border-alert-100 rounded-lg p-3">The provider reported an unsuccessful payment attempt. The original request remains in the audit trail.</p>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={() => setSelected(null)} className="flex-1 py-2 border border-clinical-200 text-xs font-semibold text-clinical-700 rounded-lg">Cancel</button>
              {latestSelected.method === 'Cash' && latestSelected.status === 'pending' && (
                <button onClick={() => { confirmCashPayment(latestSelected.reference); setSelected(null); }}
                  className="flex-1 py-2 bg-success-600 text-white text-xs font-semibold rounded-lg">Confirm Cash Received</button>
              )}
              {latestSelected.status === 'failed' && ['GCash', 'Maya'].includes(latestSelected.method) && (
                <button onClick={() => { retryOnlinePayment(latestSelected.reference); setSelected(null); }}
                  className="flex-1 py-2 bg-primary-700 text-white text-xs font-semibold rounded-lg">Retry Provider</button>
              )}
            </div>
          </div>
        </div>
      )}

      <AuditPanel title="Payment Audit Trail" count={financialAudit.length}>
        {financialAudit.map(event => (
          <AuditRow key={event.id} ts={event.timestamp} user={event.actor} action={event.action}
            detail={`${event.reference} · ${php(event.amount)}`} />
        ))}
      </AuditPanel>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODULE 3 — EXPENSE RECORDING
══════════════════════════════════════════════════════════ */

const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Supplies', 'Utilities', 'Equipment', 'Maintenance', 'Other'];

function ExpenseRecordingModule() {
  const { expenses, financialAudit, saveExpense } = useClinic();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'idle' | 'scanning' | 'review' | 'edit' | 'saved'>('idle');
  const [receiptFile, setReceiptFile] = useState('');
  const [duplicateError, setDuplicateError] = useState(false);
  const [expenseSort, setExpenseSort] = useState<{ key: 'id' | 'date' | 'merchant' | 'category' | 'amount' | 'createdBy'; direction: SortDirection }>({ key: 'date', direction: 'desc' });
  const [form, setForm] = useState({
    merchant: '',
    receiptNumber: '',
    date: '',
    amount: '',
    description: '',
    category: 'Supplies' as ExpenseCategory,
  });
  const sortedExpenses = [...expenses].sort((a, b) => {
    const left = a[expenseSort.key] ?? '';
    const right = b[expenseSort.key] ?? '';
    const result = typeof left === 'number'
      ? left - (right as number)
      : String(left).localeCompare(String(right));
    return expenseSort.direction === 'asc' ? result : -result;
  });
  const sortExpenses = (key: typeof expenseSort.key) => {
    setExpenseSort(current => current.key === key
      ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' });
  };

  const handleReceiptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setReceiptFile(file.name);
    setDuplicateError(false);
    setStep('scanning');
    setTimeout(() => {
      const incomplete = file.name.toLowerCase().includes('partial');
      setForm({
        merchant: 'ABC Dental Supply',
        receiptNumber: 'OR-12345',
        date: '2026-09-26',
        amount: incomplete ? '' : '4500',
        description: 'Dental Materials',
        category: 'Supplies',
      });
      setStep('review');
    }, 1200);
  };

  const resetCapture = () => {
    setStep('idle');
    setReceiptFile('');
    setDuplicateError(false);
    setForm({ merchant: '', receiptNumber: '', date: '', amount: '', description: '', category: 'Supplies' });
    if (fileRef.current) fileRef.current.value = '';
  };

  const confirmExpense = () => {
    if (!form.merchant || !form.date || !form.amount || !form.description) {
      setStep('edit');
      return;
    }
    const result = saveExpense({
      merchant: form.merchant,
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      date: form.date,
      receiptNumber: form.receiptNumber || undefined,
      receiptFile: receiptFile || undefined,
      createdBy: 'Carlo Bautista',
    });
    if (result === 'duplicate') {
      setDuplicateError(true);
      return;
    }
    setStep('saved');
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Expense Recording"
        subtitle="Upload once, review extracted details, and save the verified expense for automatic reporting."
        badge={<RbacBadge label="Authorized Staff" />}
        action={
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 text-white text-xs font-semibold rounded-lg hover:bg-primary-800">
            <IconUpload className="w-3.5 h-3.5" /> Scan / Upload Receipt
          </button>
        }
      />
      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleReceiptUpload} />

      {step === 'idle' && (
        <button onClick={() => fileRef.current?.click()}
          className="w-full bg-white border-2 border-dashed border-clinical-300 rounded-2xl p-10 flex flex-col items-center text-center hover:border-primary-400 transition-colors">
          <IconUpload className="w-9 h-9 text-primary-500 mb-3" />
          <span className="text-sm font-semibold text-clinical-800">Upload a receipt to begin</span>
          <span className="text-xs text-clinical-400 mt-1">JPG, PNG, or PDF · Information is extracted for review before saving</span>
        </button>
      )}

      {step === 'scanning' && (
        <div className="bg-white border border-primary-100 rounded-2xl p-10 flex flex-col items-center text-center">
          <IconLoader className="w-9 h-9 text-primary-600 mb-3" />
          <p className="text-sm font-semibold text-clinical-800">Scanning receipt…</p>
          <p className="text-xs text-clinical-500 mt-1">Extracting merchant, date, amount, description, category, and receipt number</p>
          <p className="text-[10px] text-clinical-400 mt-3">{receiptFile}</p>
        </div>
      )}

      {(step === 'review' || step === 'edit') && (
        <div className="bg-white border border-clinical-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-clinical-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-clinical-900">Review Extracted Expense</p>
              <p className="text-[10px] text-clinical-400 mt-0.5">Verify or correct extracted information before saving</p>
            </div>
            <span className="text-[10px] text-primary-600 bg-primary-50 border border-primary-100 rounded-lg px-2 py-1">{receiptFile}</span>
          </div>
          {step === 'review' ? (
            <div className="p-5">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  ['Merchant / Supplier', form.merchant || 'Not detected'],
                  ['Date', form.date || 'Not detected'],
                  ['Category', form.category],
                  ['Description', form.description || 'Not detected'],
                  ['Amount', form.amount ? php(Number(form.amount)) : 'Not detected'],
                  ['Receipt No.', form.receiptNumber || 'Not detected'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-clinical-50 border border-clinical-100 rounded-lg p-3">
                    <p className="text-[10px] text-clinical-400">{label}</p>
                    <p className={`text-xs font-medium mt-0.5 ${value === 'Not detected' ? 'text-warning-700' : 'text-clinical-800'}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-clinical-700 mb-1">Merchant / Supplier</label><input value={form.merchant} onChange={event => setForm(current => ({ ...current, merchant: event.target.value }))} className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-xs font-medium text-clinical-700 mb-1">Receipt Number <span className="font-normal text-clinical-400">(Optional)</span></label><input value={form.receiptNumber} onChange={event => setForm(current => ({ ...current, receiptNumber: event.target.value }))} className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-xs font-medium text-clinical-700 mb-1">Date</label><input type="date" value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-xs font-medium text-clinical-700 mb-1">Amount</label><input type="number" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-xs font-medium text-clinical-700 mb-1">Category</label><select value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value as ExpenseCategory }))} className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 bg-white">{EXPENSE_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-clinical-700 mb-1">Description / Items</label><input value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2" /></div>
            </div>
          )}
          {duplicateError && <p className="mx-5 mb-3 text-xs text-alert-700 bg-alert-50 border border-alert-100 rounded-lg p-3">This receipt appears to have already been recorded. No duplicate expense was created.</p>}
          <div className="px-5 py-4 border-t border-clinical-100 flex gap-2 justify-end">
            <button onClick={resetCapture} className="px-3 py-2 text-xs text-clinical-500">Cancel</button>
            {step === 'review' ? <button onClick={() => setStep('edit')} className="px-4 py-2 border border-primary-200 text-primary-700 text-xs font-semibold rounded-lg">Edit</button> : <button onClick={() => setStep('review')} className="px-4 py-2 border border-primary-200 text-primary-700 text-xs font-semibold rounded-lg">Review</button>}
            <button onClick={confirmExpense} disabled={!form.merchant || !form.date || !form.amount || !form.description}
              className="px-4 py-2 bg-success-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50">Confirm & Save</button>
          </div>
        </div>
      )}

      {step === 'saved' && (
        <div className="bg-success-50 border border-success-200 rounded-xl p-4 flex items-center gap-3">
          <IconCheck className="w-5 h-5 text-success-600" />
          <div className="flex-1"><p className="text-xs font-semibold text-success-700">Expense saved</p><p className="text-[10px] text-success-600">Reports and financial totals have updated automatically.</p></div>
          <button onClick={resetCapture} className="text-xs font-semibold text-primary-700">Record Another</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-clinical-200 overflow-x-auto">
        <div className="px-4 py-3 border-b border-clinical-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-clinical-700">Expense Records</p>
          <span className="text-[10px] text-clinical-400">{expenses.length} verified records</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-clinical-50 border-b border-clinical-100">
              <th className="px-3 py-2"><SortableHeader label="Expense ID" active={expenseSort.key === 'id'} direction={expenseSort.direction} onSort={() => sortExpenses('id')} /></th>
              <th className="px-3 py-2"><SortableHeader label="Date" active={expenseSort.key === 'date'} direction={expenseSort.direction} onSort={() => sortExpenses('date')} /></th>
              <th className="px-3 py-2"><SortableHeader label="Merchant" active={expenseSort.key === 'merchant'} direction={expenseSort.direction} onSort={() => sortExpenses('merchant')} /></th>
              <th className="px-3 py-2"><SortableHeader label="Category" active={expenseSort.key === 'category'} direction={expenseSort.direction} onSort={() => sortExpenses('category')} /></th>
              <th className="px-3 py-2 text-left font-semibold text-clinical-600">Description</th>
              <th className="px-3 py-2 text-left font-semibold text-clinical-600">Receipt</th>
              <th className="px-3 py-2"><SortableHeader label="Amount" active={expenseSort.key === 'amount'} direction={expenseSort.direction} onSort={() => sortExpenses('amount')} align="right" /></th>
              <th className="px-3 py-2"><SortableHeader label="Created By" active={expenseSort.key === 'createdBy'} direction={expenseSort.direction} onSort={() => sortExpenses('createdBy')} /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-clinical-50">{sortedExpenses.map(expense => <tr key={expense.id} className="hover:bg-clinical-50"><td className="px-3 py-2.5 font-mono text-[10px] text-clinical-500">{expense.id}</td><td className="px-3 py-2.5 text-clinical-500">{expense.date}</td><td className="px-3 py-2.5 font-medium text-clinical-800">{expense.merchant}</td><td className="px-3 py-2.5"><span className="text-[10px] bg-primary-50 text-primary-700 rounded px-1.5 py-0.5">{expense.category}</span></td><td className="px-3 py-2.5 text-clinical-500">{expense.description}</td><td className="px-3 py-2.5 text-clinical-500">{expense.receiptNumber ?? '—'}{expense.receiptFile && <p className="text-[9px] text-primary-600">{expense.receiptFile}</p>}</td><td className="px-3 py-2.5 text-right font-semibold text-clinical-900">{php(expense.amount)}</td><td className="px-3 py-2.5 text-clinical-500">{expense.createdBy}<p className="text-[9px] text-clinical-400">{expense.createdAt}</p></td></tr>)}</tbody>
        </table>
      </div>

      <AuditPanel title="Expense Audit Trail" count={financialAudit.filter(event => event.action === 'Expense Recorded').length}>
        {financialAudit.filter(event => event.action === 'Expense Recorded').map(event => <AuditRow key={event.id} ts={event.timestamp} user={event.actor} action={event.action} detail={`${event.reference} · ${php(event.amount)}`} />)}
      </AuditPanel>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODULE 4 — REFUND AND FEE ADJUSTMENT
══════════════════════════════════════════════════════════ */

export type AdjustmentTab = 'refunds' | 'cancellations' | 'corrections' | 'overpayments';

function RefundAdjustmentModule({ initialTab = 'refunds' }: { initialTab?: AdjustmentTab }) {
  const {
    payments, refundRequests, cancellationRequests, feeCorrections, financialAudit,
    decideRefund, confirmCashRefund, decideCancellation, createFeeCorrection, resolveOverpayment,
  } = useClinic();
  const [tab, setTab] = useState<AdjustmentTab>(initialTab);
  const [reviewRefund, setReviewRefund] = useState<RefundRequest | null>(null);
  const [reviewCancellation, setReviewCancellation] = useState<CancellationRequest | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [correctionForm, setCorrectionForm] = useState({ reference: '', correctedFee: '', reason: '' });

  const correctionPayment = payments.find(payment => payment.reference === correctionForm.reference);
  const correctionDifference = correctionPayment && correctionForm.correctedFee
    ? Number(correctionForm.correctedFee) - correctionPayment.amountDue
    : 0;
  const overpayments = payments.filter(payment => payment.status === 'paid' && payment.amountPaid > payment.amountDue);

  const closeReview = () => {
    setReviewRefund(null);
    setReviewCancellation(null);
    setRejecting(false);
    setRejectionReason('');
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Adjustments & Requests"
        subtitle="Review patient requests and process post-payment corrections using existing appointments and transactions."
        badge={<RbacBadge label="Authorized Review Required" />}
      />

      <div className="flex gap-1.5 flex-wrap">
        {([
          ['refunds', 'Refund Requests', refundRequests.filter(item => item.status === 'pending').length],
          ['cancellations', 'Cancellation Requests', cancellationRequests.filter(item => item.status === 'pending').length],
          ['corrections', 'Fee Corrections', feeCorrections.length],
          ['overpayments', 'Overpayments', overpayments.length],
        ] as const).map(([id, label, count]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${tab === id ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-clinical-600 border-clinical-200'}`}>
            {label} <span className="ml-1 opacity-75">{count}</span>
          </button>
        ))}
      </div>

      {tab === 'refunds' && (
        <RequestTable
          headers={['Patient', 'Transaction', 'Service', 'Amount Paid', 'Refund Requested', 'Status', 'Action']}
          empty="No refund requests"
          rows={refundRequests.map(request => [
            <div><p className="font-medium text-clinical-800">{request.patient}</p><p className="text-[10px] text-clinical-400">{request.patientId}</p></div>,
            <span className="font-mono text-[10px] text-clinical-500">{request.transactionRef}</span>,
            request.service,
            php(request.amountPaid),
            php(request.requestedAmount),
            <StatusPill status={request.status} />,
            request.status === 'pending'
              ? <button onClick={() => setReviewRefund(request)} className="text-[10px] font-semibold text-primary-700 bg-primary-50 px-2.5 py-1.5 rounded-lg">Review</button>
              : request.status === 'awaiting_cash'
                ? <button onClick={() => confirmCashRefund(request.id)} className="text-[10px] font-semibold text-success-700 bg-success-50 px-2.5 py-1.5 rounded-lg">Confirm Cash Refund</button>
                : <span className="text-clinical-400">—</span>,
          ])}
        />
      )}

      {tab === 'cancellations' && (
        <RequestTable
          headers={['Patient', 'Appointment', 'Service', 'Date', 'Reason', 'Status', 'Action']}
          empty="No cancellation requests"
          rows={cancellationRequests.map(request => [
            <div><p className="font-medium text-clinical-800">{request.patient}</p><p className="text-[10px] text-clinical-400">{request.patientId}</p></div>,
            <span className="font-mono text-[10px] text-clinical-500">{request.appointmentId}</span>,
            request.service,
            `${request.appointmentDate} · ${request.appointmentTime}`,
            request.reason,
            <StatusPill status={request.status} />,
            <button onClick={() => setReviewCancellation(request)} className="text-[10px] font-semibold text-primary-700 bg-primary-50 px-2.5 py-1.5 rounded-lg">Review</button>,
          ])}
        />
      )}

      {tab === 'corrections' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-clinical-200 p-5">
            <p className="text-sm font-semibold text-clinical-900 mb-1">Create Fee Correction</p>
            <p className="text-xs text-clinical-500 mb-4">Select an existing transaction; patient and payment details are retrieved automatically.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-clinical-700 mb-1">Existing Transaction</label>
                <select value={correctionForm.reference} onChange={event => setCorrectionForm(current => ({ ...current, reference: event.target.value }))}
                  className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 bg-white">
                  <option value="">— Select transaction —</option>
                  {payments.filter(payment => payment.status === 'paid').map(payment => (
                    <option key={payment.reference} value={payment.reference}>{payment.reference} · {payment.patient} · {payment.service}</option>
                  ))}
                </select>
              </div>
              {correctionPayment && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  {[['Patient', correctionPayment.patient], ['Patient ID', correctionPayment.patientId], ['Service', correctionPayment.service], ['Original Fee', php(correctionPayment.amountDue)], ['Method', correctionPayment.method], ['Payment Status', 'Paid / Completed']].map(([label, value]) => (
                    <div key={label} className="bg-clinical-50 rounded-lg p-2.5"><p className="text-[10px] text-clinical-400">{label}</p><p className="font-medium text-clinical-800 mt-0.5">{value}</p></div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-clinical-700 mb-1">Correct Fee</label><input type="number" value={correctionForm.correctedFee} onChange={event => setCorrectionForm(current => ({ ...current, correctedFee: event.target.value }))} className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-xs font-medium text-clinical-700 mb-1">Calculated Difference</label><div className="w-full text-sm bg-clinical-50 border border-clinical-200 rounded-lg px-3 py-2 font-semibold">{php(correctionDifference)}</div></div>
              </div>
              <div><label className="block text-xs font-medium text-clinical-700 mb-1">Reason</label><textarea value={correctionForm.reason} onChange={event => setCorrectionForm(current => ({ ...current, reason: event.target.value }))} rows={2} className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 resize-none" /></div>
              <button disabled={!correctionPayment || !correctionForm.correctedFee || !correctionForm.reason} onClick={() => { createFeeCorrection(correctionForm.reference, Number(correctionForm.correctedFee), correctionForm.reason); setCorrectionForm({ reference: '', correctedFee: '', reason: '' }); }} className="px-4 py-2 bg-primary-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50">Approve Fee Correction</button>
            </div>
          </div>
          <RequestTable headers={['Reference', 'Patient', 'Service', 'Original Fee', 'Corrected Fee', 'Difference', 'Status']} empty="No fee corrections" rows={feeCorrections.map(item => [item.transactionRef, item.patient, item.service, php(item.originalFee), php(item.correctedFee), php(item.difference), <StatusPill status={item.status} />])} />
        </div>
      )}

      {tab === 'overpayments' && (
        <RequestTable
          headers={['Reference', 'Patient', 'Amount Due', 'Amount Paid', 'Overpaid', 'Actions']}
          empty="No overpayments detected"
          rows={overpayments.map(payment => [
            payment.reference,
            <div><p className="font-medium text-clinical-800">{payment.patient}</p><p className="text-[10px] text-clinical-400">{payment.patientId}</p></div>,
            php(payment.amountDue),
            php(payment.amountPaid),
            <strong className="text-warning-700">{php(payment.amountPaid - payment.amountDue)}</strong>,
            <div className="flex gap-1.5 justify-end"><button onClick={() => resolveOverpayment(payment.reference, 'future_balance')} className="text-[10px] font-semibold text-primary-700 border border-primary-200 px-2 py-1 rounded">Apply to Future Balance</button><button onClick={() => resolveOverpayment(payment.reference, 'refund')} className="text-[10px] font-semibold text-alert-700 border border-alert-200 px-2 py-1 rounded">Request Refund</button></div>,
          ])}
        />
      )}

      {(reviewRefund || reviewCancellation) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 m-4">
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-clinical-900">Review {reviewRefund ? 'Refund Request' : 'Cancellation Request'}</h3><button onClick={closeReview}><IconX className="w-5 h-5 text-clinical-400" /></button></div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(reviewRefund ? [
                ['Patient', reviewRefund.patient], ['Patient ID', reviewRefund.patientId], ['Transaction', reviewRefund.transactionRef], ['Service', reviewRefund.service], ['Original Amount', php(reviewRefund.amountPaid)], ['Method', reviewRefund.method], ['Payment Status', 'Paid / Completed'], ['Payment Date', reviewRefund.paymentDate], ['Refund Requested', php(reviewRefund.requestedAmount)], ['Reason', reviewRefund.reason], ['Supporting Document', reviewRefund.supportingDocument ?? 'None attached'],
              ] : reviewCancellation ? [
                ['Patient', reviewCancellation.patient], ['Patient ID', reviewCancellation.patientId], ['Appointment', reviewCancellation.appointmentId], ['Service', reviewCancellation.service], ['Date / Time', `${reviewCancellation.appointmentDate} · ${reviewCancellation.appointmentTime}`], ['Reason', reviewCancellation.reason], ['Payment Status', reviewCancellation.paymentStatus.replace('_', ' ')],
              ] : []).map(([label, value]) => <div key={label} className="bg-clinical-50 rounded-lg p-2.5"><p className="text-[10px] text-clinical-400">{label}</p><p className="font-medium text-clinical-800 mt-0.5">{value}</p></div>)}
            </div>
            {reviewCancellation?.paymentStatus === 'paid' && <p className="mt-3 text-xs text-warning-700 bg-warning-50 border border-warning-100 rounded-lg p-3">Approval cancels the appointment and creates a separate refund request for review. The original payment remains unchanged.</p>}
            {rejecting && <div className="mt-3"><label className="block text-xs font-medium text-clinical-700 mb-1">Rejection reason</label><textarea value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} rows={2} className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 resize-none" /></div>}
            <div className="mt-4 flex gap-2">
              <button onClick={closeReview} className="px-3 py-2 text-xs text-clinical-500">Cancel</button>
              <button onClick={() => setRejecting(true)} className="flex-1 py-2 border border-alert-200 text-alert-700 text-xs font-semibold rounded-lg">Reject</button>
              {rejecting ? <button disabled={!rejectionReason} onClick={() => { if (reviewRefund) decideRefund(reviewRefund.id, 'rejected', rejectionReason); if (reviewCancellation) decideCancellation(reviewCancellation.id, 'rejected', rejectionReason); closeReview(); }} className="flex-1 py-2 bg-alert-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50">Confirm Rejection</button> : <button onClick={() => { if (reviewRefund) decideRefund(reviewRefund.id, 'approved'); if (reviewCancellation) decideCancellation(reviewCancellation.id, 'approved'); closeReview(); }} className="flex-1 py-2 bg-success-600 text-white text-xs font-semibold rounded-lg">{reviewRefund ? 'Approve Refund' : 'Approve Cancellation'}</button>}
            </div>
          </div>
        </div>
      )}

      <AuditPanel title="Adjustment & Request Audit Trail" count={financialAudit.length}>
        {financialAudit.filter(event => /Refund|Cancellation|Correction|Overpayment|Balance/.test(event.action)).map(event => <AuditRow key={event.id} ts={event.timestamp} user={event.actor} action={event.action} detail={`${event.reference} · ${php(event.amount)}`} />)}
      </AuditPanel>
    </div>
  );
}

function RequestTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  return (
    <div className="bg-white rounded-xl border border-clinical-200 overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="bg-clinical-50 border-b border-clinical-100">{headers.map(header => <th key={header} className="px-4 py-2.5 text-left font-semibold text-clinical-600 whitespace-nowrap last:text-right">{header}</th>)}</tr></thead>
        <tbody className="divide-y divide-clinical-50">{rows.length === 0 ? <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-clinical-400">{empty}</td></tr> : rows.map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-clinical-50">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-clinical-600 whitespace-nowrap last:text-right">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODULE 5 — OUTSTANDING BALANCE MONITORING
══════════════════════════════════════════════════════════ */

function OutstandingBalanceModule() {
  const { payments } = useClinic();
  const accounts: OverdueAccount[] = payments
    .filter(payment => payment.status !== 'paid')
    .map(payment => ({
      reference: payment.reference,
      patientId: payment.patientId,
      patient: payment.patient,
      amount: Math.max(payment.amountDue - payment.amountPaid, 0),
      dueDate: payment.createdAt.slice(0, 10),
      daysOverdue: payment.status === 'failed' ? 1 : 0,
      lastReminder: payment.status === 'failed' ? '2026-09-24 08:00' : '2026-09-24',
      reminderSent: true,
      nextReminderHours: payment.status === 'failed' ? 7 : undefined,
    }));

  const dueToday = accounts.filter(a => a.daysOverdue === 0);
  const overdue = accounts.filter(a => a.daysOverdue > 0);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Outstanding Balance Monitoring"
        subtitle="Rule-based automatic flagging of overdue and due-today accounts. Not manual — balances are monitored continuously from Payment Processing."
      />

      {accounts.length === 0 ? (
        <div className="bg-white rounded-xl border border-clinical-200 p-10 text-center">
          <IconCheck className="w-10 h-10 text-success-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-success-700">All patient balances are settled</p>
          <p className="text-xs text-clinical-400 mt-1">No overdue or due-today accounts detected.</p>
        </div>
      ) : (
        <>
          {/* Alert banner */}
          <div className="flex items-center gap-3 p-3.5 bg-alert-50 border border-alert-200 rounded-xl">
            <IconAlert className="w-5 h-5 text-alert-600 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-alert-700">
                {overdue.length} overdue account{overdue.length !== 1 ? 's' : ''} · {dueToday.length} due today
              </p>
              <p className="text-[11px] text-alert-600">Overdue patients receive an automatic reminder every 24 hours until their balance is paid.</p>
            </div>
          </div>

          {/* Due Today */}
          {dueToday.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-clinical-700 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-warning-500" /> Due Today — Sep 24, 2026
              </p>
              <div className="space-y-2">
                {dueToday.map(acc => (
                  <BalanceCard key={acc.reference} acc={acc} />
                ))}
              </div>
            </div>
          )}

          {/* Overdue */}
          {overdue.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-clinical-700 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-alert-600" /> Overdue Accounts
              </p>
              <div className="space-y-2">
                {overdue.map(acc => (
                  <BalanceCard key={acc.reference} acc={acc} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}

function BalanceCard({ acc }: { acc: OverdueAccount }) {
  const isOverdue = acc.daysOverdue > 0;
  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${isOverdue ? 'border-alert-200' : 'border-warning-200'}`}>
      <div className="flex items-center gap-4 px-5 py-3.5">
        <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
          <IconUser className="w-4 h-4 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-clinical-900">{acc.patient}</p>
            <span className="text-[10px] font-mono text-clinical-400 bg-clinical-100 px-1.5 py-0.5 rounded">{acc.patientId}</span>
            <StatusPill status={isOverdue ? 'overdue' : 'due-today'} />
          </div>
          <p className="text-xs text-clinical-500 mt-0.5">
            Due: {acc.dueDate} · {isOverdue ? `${acc.daysOverdue} day${acc.daysOverdue > 1 ? 's' : ''} overdue` : 'Due today'}
            {acc.lastReminder && ` · Last reminder: ${acc.lastReminder}`}
          </p>
        </div>
        <p className="text-base font-bold text-alert-700 tabular-nums shrink-0">{php(acc.amount)}</p>
      </div>
      <div className={`px-5 py-2.5 border-t flex items-center gap-2 ${isOverdue ? 'bg-alert-50 border-alert-100' : 'bg-warning-50 border-warning-100'}`}>
        {acc.reminderSent && (
          <span className="flex items-center gap-1 text-[10px] text-success-600 font-medium">
            <IconCheck className="w-3 h-3" /> Reminder sent {acc.lastReminder}
          </span>
        )}
        <span className="ml-auto text-[10px] font-medium text-clinical-600">
          {isOverdue && acc.nextReminderHours
            ? `Repeats every 24 hours · Next reminder in ${acc.nextReminderHours} hours`
            : 'Due-today reminder sent'}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODULE 5 — FINANCIAL REPORTING
══════════════════════════════════════════════════════════ */

function ReportingModule() {
  const { payments, expenses } = useClinic();
  const [period, setPeriod] = useState<'daily' | 'monthly'>('monthly');
  const [selectedDate, setSelectedDate] = useState('2026-09-26');
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [expenseCategory, setExpenseCategory] = useState('All');
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const inPeriod = (date: string) => period === 'daily' ? date === selectedDate : date.startsWith(selectedMonth);
  const filteredPayments = payments.filter(payment => inPeriod(payment.paymentDate ?? payment.createdAt.slice(0, 10)));
  const periodExpenses = expenses.filter(expense => inPeriod(expense.date));
  const filteredExpenses = periodExpenses.filter(expense => expenseCategory === 'All' || expense.category === expenseCategory);
  const expenseCategories = ['All', ...EXPENSE_CATEGORIES];

  const revenue = filteredPayments
    .filter(payment => payment.status === 'paid')
    .reduce((sum, payment) => sum + payment.amountPaid, 0);
  const totalExpenses = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const filteredExpenseTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netIncome = revenue - totalExpenses;
  const expenseBreakdown = EXPENSE_CATEGORIES.map(category => ({
    category,
    amount: filteredExpenses.filter(expense => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0),
  })).filter(item => item.amount > 0);
  const periodLabel = period === 'daily'
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Financial Reports"
        subtitle="Live income, revenue, and expense reporting from payments and verified expense records."
        action={<div className="flex items-center gap-2"><div className="flex rounded-lg border border-clinical-200 overflow-hidden text-xs">{(['daily', 'monthly'] as const).map(item => <button key={item} onClick={() => setPeriod(item)} className={`px-3 py-1.5 font-medium capitalize ${period === item ? 'bg-primary-700 text-white' : 'bg-white text-clinical-600'}`}>{item}</button>)}</div><button onClick={() => { setGenerating(true); setTimeout(() => setGenerating(false), 700); }} disabled={generating} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60">{generating ? <IconLoader className="w-3.5 h-3.5" /> : <IconFileText className="w-3.5 h-3.5" />}Generate Report</button></div>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white border border-clinical-200 rounded-xl p-4">
        <div><label className="block text-xs font-medium text-clinical-700 mb-1">Reporting Period</label>{period === 'daily' ? <input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2" /> : <input type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2" />}</div>
        <div><label className="block text-xs font-medium text-clinical-700 mb-1">Expense Category</label><select value={expenseCategory} onChange={event => setExpenseCategory(event.target.value)} className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 bg-white">{expenseCategories.map(category => <option key={category}>{category}</option>)}</select></div>
        <div className="flex items-end"><div className="w-full bg-clinical-50 border border-clinical-100 rounded-lg px-3 py-2"><p className="text-[10px] text-clinical-400">Current report</p><p className="text-xs font-semibold text-clinical-700">{periodLabel}</p></div></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Revenue', value: revenue, cls: 'bg-success-50 border-success-100 text-success-700' },
          { label: 'Income (Net Income)', value: netIncome, cls: 'bg-success-50 border-success-100 text-success-700' },
          { label: 'Expenses', value: totalExpenses, cls: 'bg-alert-50 border-alert-100 text-alert-700' },
        ].map(item => <div key={item.label} className={`rounded-xl border p-4 ${item.cls}`}><p className="text-[10px] font-semibold mb-1">{item.label}</p><p className="text-xl font-bold">{php(item.value)}</p><p className="text-[10px] opacity-70 mt-1">{periodLabel}</p></div>)}
      </div>

      <div className="bg-white rounded-xl border border-clinical-200 overflow-x-auto">
        <div className="px-4 py-3 border-b border-clinical-100 flex items-center justify-between"><div><p className="text-xs font-semibold text-clinical-700">Revenue Records</p><p className="text-[10px] text-clinical-400">Automatically sourced from payment transactions</p></div><span className="text-xs font-bold text-success-700">{php(revenue)}</span></div>
        <table className="w-full text-xs"><thead><tr className="bg-clinical-50 border-b border-clinical-100">{['Date', 'Reference', 'Patient', 'Service', 'Payment Method', 'Amount', 'Status'].map(header => <th key={header} className="px-3 py-2 text-left font-semibold text-clinical-600 last:text-right">{header}</th>)}</tr></thead><tbody className="divide-y divide-clinical-50">{filteredPayments.map(payment => <tr key={payment.reference}><td className="px-3 py-2.5 text-clinical-500">{payment.paymentDate ?? payment.createdAt.slice(0, 10)}</td><td className="px-3 py-2.5 font-mono text-[10px] text-clinical-500">{payment.reference}</td><td className="px-3 py-2.5 text-clinical-700">{payment.patient}</td><td className="px-3 py-2.5 text-clinical-500">{payment.service}</td><td className="px-3 py-2.5 text-clinical-500">{payment.method}</td><td className="px-3 py-2.5 font-semibold text-clinical-900">{php(payment.status === 'paid' ? payment.amountPaid : payment.amountDue)}</td><td className="px-3 py-2.5 text-right"><StatusPill status={payment.status} /></td></tr>)}</tbody></table>{filteredPayments.length === 0 && <p className="py-8 text-center text-xs text-clinical-400">No revenue records in this period</p>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-clinical-200 p-4">
          <div className="flex items-center justify-between mb-3"><div><p className="text-xs font-semibold text-clinical-700">Expense Breakdown</p><p className="text-[10px] text-clinical-400">{periodLabel}</p></div><div className="text-right"><p className="text-lg font-bold text-alert-700">{php(filteredExpenseTotal)}</p><p className="text-[10px] text-clinical-400">{filteredExpenses.length} records</p></div></div>
          <div className="space-y-1">{expenseBreakdown.length === 0 ? <p className="py-8 text-center text-xs text-clinical-400">No expenses match the filters</p> : expenseBreakdown.map(item => <div key={item.category} className="flex items-center justify-between py-2 border-b border-clinical-50"><span className="text-xs font-medium text-clinical-700">{item.category}</span><span className="text-xs font-semibold text-clinical-900">{php(item.amount)}</span></div>)}</div>
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-clinical-200"><span className="text-xs font-bold text-clinical-800">Total Expenses</span><span className="text-sm font-bold text-alert-700">{php(filteredExpenseTotal)}</span></div>
        </div>
        <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-clinical-100"><p className="text-xs font-semibold text-clinical-700">Expense Records</p><p className="text-[10px] text-clinical-400">Same verified data saved in Expense Recording</p></div>
          <div className="max-h-72 overflow-y-auto divide-y divide-clinical-50">{filteredExpenses.map(expense => <div key={expense.id} className="flex items-center px-4 py-3 text-xs"><div className="flex-1"><p className="font-medium text-clinical-800">{expense.merchant}</p><p className="text-[10px] text-clinical-400">{expense.date} · {expense.category} · {expense.description}</p></div><p className="font-semibold text-alert-700">{php(expense.amount)}</p></div>)}{filteredExpenses.length === 0 && <p className="py-8 text-center text-xs text-clinical-400">No expense records in this period</p>}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-clinical-200 p-4 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-clinical-700">Export Report</p><p className="text-[10px] text-clinical-400 mt-0.5">{periodLabel} · Automatically refreshed from shared financial data</p></div><div className="flex gap-2"><button onClick={() => { setExporting('pdf'); setTimeout(() => setExporting(null), 800); }} className="px-4 py-2 bg-alert-600 text-white text-xs font-semibold rounded-lg">{exporting === 'pdf' ? 'Preparing…' : 'Export PDF'}</button><button onClick={() => { setExporting('excel'); setTimeout(() => setExporting(null), 800); }} className="px-4 py-2 bg-success-600 text-white text-xs font-semibold rounded-lg">{exporting === 'excel' ? 'Preparing…' : 'Export Excel'}</button></div></div>

    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ROOT BILLING VIEW
══════════════════════════════════════════════════════════ */

const MODULES = [
  { id: 'price-list', label: 'Service Price List', short: 'Price List' },
  { id: 'payments', label: 'Payments', short: 'Payments' },
  { id: 'expenses', label: 'Expenses', short: 'Expenses' },
  { id: 'adjustments', label: 'Adjustments / Requests', short: 'Adjustments' },
  { id: 'balances', label: 'Balances', short: 'Balances' },
  { id: 'reports', label: 'Reports', short: 'Reports' },
] as const;

export type BillingModule = typeof MODULES[number]['id'];

export default function Billing({ initialModule = 'payments', initialAdjustmentTab = 'refunds' }: { initialModule?: BillingModule; initialAdjustmentTab?: AdjustmentTab }) {
  const [activeModule, setActiveModule] = useState<BillingModule>(initialModule);

  return (
    <div className="flex flex-col h-full">
      {/* Module sub-navigation */}
      <div className="bg-white border-b border-clinical-200 px-6 pt-5 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-clinical-900 font-display">Billing & Financial Management</h1>
            <p className="text-xs text-clinical-500">Premier Dental Solutions PH · Single-clinic BPA System</p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-clinical-400">
            <IconReceipt className="w-4 h-4" />
            <span>All financial data is logged in audit trail</span>
          </div>
        </div>
        <div className="flex gap-0.5 overflow-x-auto">
          {MODULES.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveModule(id)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                activeModule === id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-clinical-500 hover:text-clinical-700 hover:border-clinical-300'
              }`}>{label}</button>
          ))}
        </div>
      </div>

      {/* Module content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeModule === 'price-list' && <PriceListModule />}
        {activeModule === 'payments' && <PaymentProcessingModule />}
        {activeModule === 'expenses' && <ExpenseRecordingModule />}
        {activeModule === 'adjustments' && <RefundAdjustmentModule initialTab={initialAdjustmentTab} />}
        {activeModule === 'balances' && <OutstandingBalanceModule />}
        {activeModule === 'reports' && <ReportingModule />}
      </div>
    </div>
  );
}
