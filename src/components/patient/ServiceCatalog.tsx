import { useEffect, useMemo, useState } from 'react';
import { IconCalendar, IconCheck, IconChevronRight, IconSearch, IconX } from '../icons';
import { useServiceCatalog, type ServiceRecord } from '../../context/ServiceCatalogContext';

interface Props {
  onBook: (serviceIds: string[]) => void;
}

export default function ServiceCatalog({ onBook }: Props) {
  const { publishedServices } = useServiceCatalog();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(timeout);
  }, []);

  const categories = ['All', ...new Set(publishedServices.map(service => service.category))];
  const filtered = useMemo(() => publishedServices.filter(service => {
    const searchable = `${service.code} ${service.name} ${service.description} ${service.category}`.toLowerCase();
    return (category === 'All' || service.category === category)
      && searchable.includes(query.toLowerCase());
  }), [category, publishedServices, query]);
  const selected = publishedServices.filter(service => selectedIds.includes(service.id));
  const estimatedTotal = selected.reduce((total, service) => total + service.price, 0);

  const toggleService = (serviceId: string) => {
    setSelectedIds(current => current.includes(serviceId)
      ? current.filter(id => id !== serviceId)
      : [...current, serviceId]);
  };

  return (
    <div className="flex min-h-full flex-col bg-clinical-50">
      <div className="border-b border-clinical-200 bg-white px-5 py-5">
        <p className="font-display text-lg font-semibold text-clinical-900">Service Catalog</p>
        <p className="mt-1 text-xs text-clinical-500">Browse current clinic services and published prices.</p>
        <div className="relative mt-4">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clinical-400" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search services..."
            className="w-full rounded-full border border-clinical-200 bg-clinical-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {categories.map(item => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${category === item ? 'border-primary-700 bg-primary-700 text-white' : 'border-clinical-200 bg-white text-clinical-600'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 p-4 pb-44">
        <div className="flex items-center justify-between text-xs text-clinical-500">
          <span>{filtered.length} published services</span>
          <span>Prices updated from master list</span>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(item => <div key={item} className="h-28 animate-pulse rounded-xl border border-clinical-200 bg-white" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-clinical-200 bg-white px-6 py-12 text-center">
            <IconSearch className="mx-auto h-6 w-6 text-clinical-300" />
            <p className="mt-3 text-sm font-medium text-clinical-700">No services found</p>
            <p className="mt-1 text-xs text-clinical-400">Try another search or category.</p>
          </div>
        ) : filtered.map(service => {
          const selectedService = selectedIds.includes(service.id);
          return (
            <div key={service.id} className={`rounded-xl border bg-white p-4 transition ${selectedService ? 'border-primary-400 ring-2 ring-primary-100' : 'border-clinical-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-700">{service.category}</p>
                  <p className="mt-1 text-sm font-semibold text-clinical-900">{service.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-clinical-500">{service.description}</p>
                  <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
                    {service.inclusions.slice(0, 2).map(item => (
                      <span key={item} className="inline-flex items-center gap-1 text-[10px] text-clinical-500">
                        <IconCheck className="h-3 w-3 text-success-600" /> {item}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="shrink-0 text-base font-bold text-clinical-900">₱{service.price.toLocaleString()}</p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button onClick={() => setDetail(service)} className="text-xs font-semibold text-primary-700">View details</button>
                <button onClick={() => toggleService(service.id)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${selectedService ? 'bg-success-50 text-success-700' : 'bg-primary-700 text-white'}`}>
                  {selectedService && <IconCheck className="h-3.5 w-3.5" />}
                  {selectedService ? 'Selected' : 'Add to estimate'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="absolute inset-x-0 bottom-16 border-t border-clinical-200 bg-white px-4 py-4 shadow-xl">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold text-clinical-700">Selected Services ({selected.length})</p>
              <p className="mt-1 text-[10px] text-clinical-400">Estimated Treatment Cost</p>
            </div>
            <p className="text-xl font-bold text-clinical-900">₱{estimatedTotal.toLocaleString()}</p>
          </div>
          <div className="mt-3 max-h-24 space-y-1.5 overflow-y-auto border-y border-clinical-100 py-2">
            {selected.map(service => (
              <div key={service.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-clinical-600">{service.name}</span>
                <span className="shrink-0 font-semibold text-clinical-800">₱{service.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-clinical-400">Estimate only. Final cost may vary after the dentist’s clinical assessment.</p>
          <button onClick={() => onBook(selectedIds)} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-700 py-2.5 text-xs font-semibold text-white">
            <IconCalendar className="h-4 w-4" /> Book Appointment
          </button>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-clinical-900/30">
          <button aria-label="Close service details" onClick={() => setDetail(null)} className="absolute inset-0" />
          <section className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-700">{detail.category}</p>
                <p className="mt-1 font-display text-lg font-semibold text-clinical-900">{detail.name}</p>
              </div>
              <button onClick={() => setDetail(null)} className="rounded-lg p-2 text-clinical-500 hover:bg-clinical-100"><IconX className="h-5 w-5" /></button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-clinical-600">{detail.description}</p>
            <div className="mt-4 rounded-xl bg-clinical-50 p-4">
              <p className="text-xs font-semibold text-clinical-700">Included</p>
              <div className="mt-2 space-y-1.5">
                {detail.inclusions.map(item => <p key={item} className="flex items-center gap-2 text-xs text-clinical-600"><IconCheck className="h-3.5 w-3.5 text-success-600" />{item}</p>)}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div><p className="text-[10px] text-clinical-400">Current published price</p><p className="text-xl font-bold text-clinical-900">₱{detail.price.toLocaleString()}</p></div>
              <button onClick={() => { toggleService(detail.id); setDetail(null); }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white">
                Add to estimate <IconChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
