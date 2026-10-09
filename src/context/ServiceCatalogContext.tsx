import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type ServiceStatus = 'active' | 'inactive';

export interface ServiceRecord {
  id: string;
  code: string;
  category: string;
  name: string;
  description: string;
  inclusions: string[];
  price: number;
  effectiveDate: string;
  status: ServiceStatus;
  scheduledPrice?: number;
  scheduledEffectiveDate?: string;
}

export interface PriceAuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  service: string;
  detail: string;
  serviceCode?: string;
  serviceName?: string;
  previousPrice?: number;
  newPrice?: number;
  effectiveDate?: string;
}

const SEED_SERVICES: ServiceRecord[] = [
  { id: 's1', code: 'DEN-PRE-001', category: 'Preventive', name: 'Dental Prophylaxis (Cleaning)', description: 'Professional removal of plaque, stains, and calculus.', inclusions: ['Oral assessment', 'Scaling', 'Polishing'], price: 800, effectiveDate: '2026-01-01', status: 'active' },
  { id: 's2', code: 'DEN-PRE-002', category: 'Preventive', name: 'Fluoride Treatment', description: 'Topical fluoride application to strengthen enamel.', inclusions: ['Oral assessment', 'Fluoride application'], price: 500, effectiveDate: '2026-01-01', status: 'active' },
  { id: 's3', code: 'DEN-RES-003', category: 'Restorative', name: 'Composite Restoration (1 surface)', description: 'Tooth-colored restoration for a single-surface cavity.', inclusions: ['Local anesthesia', 'Composite filling', 'Bite adjustment'], price: 2500, effectiveDate: '2026-01-01', status: 'active' },
  { id: 's4', code: 'DEN-RES-004', category: 'Restorative', name: 'Root Canal Treatment', description: 'Endodontic treatment for infected or damaged dental pulp.', inclusions: ['Local anesthesia', 'Canal cleaning', 'Shaping', 'Temporary sealing'], price: 8000, effectiveDate: '2026-03-15', status: 'active' },
  { id: 's5', code: 'DEN-SUR-005', category: 'Oral Surgery', name: 'Simple Extraction', description: 'Removal of an erupted tooth under local anesthesia.', inclusions: ['Assessment', 'Local anesthesia', 'Post-operative instructions'], price: 1500, effectiveDate: '2026-01-01', status: 'active' },
  { id: 's6', code: 'DEN-SUR-006', category: 'Oral Surgery', name: 'Surgical Extraction', description: 'Surgical removal of an impacted or complex tooth.', inclusions: ['Assessment', 'Local anesthesia', 'Surgical extraction', 'Post-operative review'], price: 4500, effectiveDate: '2026-01-01', status: 'active' },
  { id: 's7', code: 'DEN-COS-007', category: 'Cosmetic', name: 'Teeth Bleaching (In-Clinic)', description: 'Chairside whitening treatment for visible stain reduction.', inclusions: ['Shade assessment', 'Gum protection', 'Whitening treatment'], price: 8000, effectiveDate: '2026-06-01', status: 'active' },
  { id: 's8', code: 'DEN-PRO-008', category: 'Prosthodontics', name: 'PFM Crown', description: 'Porcelain-fused-to-metal crown for a damaged tooth.', inclusions: ['Tooth preparation', 'Temporary crown', 'Final crown placement'], price: 15000, effectiveDate: '2026-01-01', status: 'inactive' },
  { id: 's9', code: 'DEN-ORT-009', category: 'Orthodontics', name: 'Dental Consultation', description: 'Clinical consultation and initial treatment assessment.', inclusions: ['Oral examination', 'Treatment discussion'], price: 500, effectiveDate: '2026-01-01', status: 'active' },
];

const INITIAL_AUDIT: PriceAuditEntry[] = [
  { id: 'pa-0', timestamp: '2026-09-01 08:30', user: 'Dr. Reyes', action: 'Price Updated', service: 'DEN-RES-004 · Root Canal Treatment', detail: '₱12,000.00 → ₱8,000.00', serviceCode: 'DEN-RES-004', serviceName: 'Root Canal Treatment', previousPrice: 12000, newPrice: 8000, effectiveDate: '2026-09-01' },
  { id: 'pa-1', timestamp: '2026-09-20 09:14', user: 'Dr. Reyes', action: 'Price Updated', service: 'DEN-COS-007 · Teeth Bleaching (In-Clinic)', detail: '₱7,500.00 → ₱8,000.00', serviceCode: 'DEN-COS-007', serviceName: 'Teeth Bleaching (In-Clinic)', previousPrice: 7500, newPrice: 8000, effectiveDate: '2026-06-01' },
  { id: 'pa-2', timestamp: '2026-06-01 10:00', user: 'Dr. Reyes', action: 'Catalog published', service: 'All active services', detail: 'Patient Service Catalog synchronized' },
  { id: 'pa-3', timestamp: '2026-03-15 14:22', user: 'Dr. Reyes', action: 'Service Created', service: 'DEN-RES-004 · Root Canal Treatment', detail: '₱12,000.00 · Active', serviceCode: 'DEN-RES-004', serviceName: 'Root Canal Treatment', newPrice: 12000, effectiveDate: '2026-03-15' },
];

interface ServiceCatalogContextValue {
  masterServices: ServiceRecord[];
  publishedServices: ServiceRecord[];
  categories: string[];
  audit: PriceAuditEntry[];
  hasUnpublishedChanges: boolean;
  saveService: (service: ServiceRecord) => void;
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  publishCatalog: () => void;
}

const ServiceCatalogContext = createContext<ServiceCatalogContextValue | null>(null);

export function ServiceCatalogProvider({ children }: { children: ReactNode }) {
  const [masterServices, setMasterServices] = useState<ServiceRecord[]>(SEED_SERVICES);
  const [publishedServices, setPublishedServices] = useState<ServiceRecord[]>(
    SEED_SERVICES.filter(service => service.status === 'active'),
  );
  const [categories, setCategories] = useState(['Preventive', 'Restorative', 'Orthodontics', 'Oral Surgery', 'Cosmetic', 'Prosthodontics']);
  const [audit, setAudit] = useState<PriceAuditEntry[]>(INITIAL_AUDIT);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);

  const addAudit = (
    action: string,
    service: string,
    detail: string,
    metadata?: Pick<PriceAuditEntry, 'serviceCode' | 'serviceName' | 'previousPrice' | 'newPrice' | 'effectiveDate'>,
  ) => {
    setAudit(current => [{
      id: `pa-${Date.now()}`,
      timestamp: new Date().toLocaleString('en-PH', { hour12: false }).slice(0, 16),
      user: 'Dr. Reyes',
      action,
      service,
      detail,
      ...metadata,
    }, ...current]);
  };

  const saveService = (service: ServiceRecord) => {
    const existing = masterServices.find(item => item.id === service.id);
    setMasterServices(current => existing
      ? current.map(item => item.id === service.id ? service : item)
      : [...current, service]);
    setHasUnpublishedChanges(true);
    const priceChanged = Boolean(
      existing
      && service.scheduledPrice
      && service.scheduledPrice !== existing.price
      && service.scheduledPrice !== existing.scheduledPrice
    );
    const statusChanged = Boolean(existing && existing.status !== service.status);
    const action = !existing
      ? 'Service Created'
      : priceChanged
        ? 'Price Updated'
        : statusChanged
          ? service.status === 'active' ? 'Service Activated' : 'Service Deactivated'
          : 'Service Edited';
    addAudit(
      action,
      `${service.code} · ${service.name}`,
      priceChanged
        ? `₱${existing!.price.toLocaleString()} → ₱${service.scheduledPrice!.toLocaleString()} · Effective ${service.scheduledEffectiveDate}`
        : `₱${service.price.toLocaleString()} · ${service.status === 'active' ? 'Active' : 'Inactive'}`,
      {
        serviceCode: service.code,
        serviceName: service.name,
        previousPrice: existing?.price,
        newPrice: priceChanged ? service.scheduledPrice : service.price,
        effectiveDate: priceChanged ? service.scheduledEffectiveDate : service.effectiveDate,
      },
    );
  };

  const addCategory = (category: string) => {
    setCategories(current => current.includes(category) ? current : [...current, category]);
    setHasUnpublishedChanges(true);
    addAudit('Category created', category, 'Pending publication');
  };

  const removeCategory = (category: string) => {
    setCategories(current => current.filter(item => item !== category));
    setHasUnpublishedChanges(true);
    addAudit('Category removed', category, 'Pending publication');
  };

  const publishCatalog = () => {
    const actualDate = new Date().toISOString().slice(0, 10);
    const today = actualDate > '2026-09-24' ? actualDate : '2026-09-24';
    const resolvedMaster = masterServices.map(service =>
      service.scheduledPrice && service.scheduledEffectiveDate && service.scheduledEffectiveDate <= today
        ? { ...service, price: service.scheduledPrice, effectiveDate: service.scheduledEffectiveDate, scheduledPrice: undefined, scheduledEffectiveDate: undefined }
        : service
    );
    const patientCatalog = resolvedMaster
      .filter(service => service.status === 'active')
    setMasterServices(resolvedMaster);
    setPublishedServices(patientCatalog);
    setHasUnpublishedChanges(false);
    addAudit('Catalog published', 'All eligible active services', `${patientCatalog.length} services synchronized to Patient Service Catalog`);
  };

  const actualDate = new Date().toISOString().slice(0, 10);
  const catalogDate = actualDate > '2026-09-24' ? actualDate : '2026-09-24';
  const resolveEffectivePrices = (services: ServiceRecord[]) =>
    services.map(service =>
      service.scheduledPrice && service.scheduledEffectiveDate && service.scheduledEffectiveDate <= catalogDate
        ? {
            ...service,
            price: service.scheduledPrice,
            effectiveDate: service.scheduledEffectiveDate,
            scheduledPrice: undefined,
            scheduledEffectiveDate: undefined,
          }
        : service
    );
  const effectiveMasterServices = useMemo(
    () => resolveEffectivePrices(masterServices),
    [masterServices, catalogDate],
  );
  const effectivePublishedServices = useMemo(
    () => resolveEffectivePrices(publishedServices)
      .filter(service => service.status === 'active' && service.effectiveDate <= catalogDate),
    [publishedServices, catalogDate],
  );

  const value = useMemo(() => ({
    masterServices: effectiveMasterServices,
    publishedServices: effectivePublishedServices,
    categories,
    audit,
    hasUnpublishedChanges,
    saveService,
    addCategory,
    removeCategory,
    publishCatalog,
  }), [audit, categories, effectiveMasterServices, effectivePublishedServices, hasUnpublishedChanges]);

  return <ServiceCatalogContext.Provider value={value}>{children}</ServiceCatalogContext.Provider>;
}

export function useServiceCatalog() {
  const context = useContext(ServiceCatalogContext);
  if (!context) throw new Error('useServiceCatalog must be used inside ServiceCatalogProvider');
  return context;
}
