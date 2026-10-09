import { useState } from 'react';
import {
  IconSearch, IconLock, IconUnlock, IconUser,
  IconCheck, IconX, IconClock, IconLoader, IconAlert, IconChevronRight
} from '../icons';
import type { ProfileTab } from './PatientProfile';

type AccessState = 'none' | 'pending' | 'granted' | 'denied';
type SearchField = 'name-id' | 'phone' | 'dob';

interface SearchResult {
  id: string;
  name: string;
  dob: string;
  phone: string;
  lastVisit: string;
  lastProcedure: string;
  dentist: string;
  accessState: AccessState;
  alertCount?: number;
}

interface Props {
  onViewPatient: (id: string, name: string, tab?: ProfileTab) => void;
}

const MOCK_RESULTS: SearchResult[] = [
  { id: 'P-1042', name: 'Ana Kristina Reyes', dob: '1990-07-22', phone: '0917-xxx-xxxx', lastVisit: 'Sep 10, 2026', lastProcedure: 'Prophylaxis', dentist: 'Dr. Reyes', accessState: 'granted', alertCount: 4 },
  { id: 'P-0891', name: 'Maria Corazon Santos', dob: '1985-03-14', phone: '0918-xxx-xxxx', lastVisit: 'Aug 28, 2026', lastProcedure: 'Composite Restoration', dentist: 'Dr. Reyes', accessState: 'none' },
  { id: 'P-1156', name: 'Ramon Aurelio Cruz', dob: '1975-11-30', phone: '0920-xxx-xxxx', lastVisit: 'Jul 15, 2026', lastProcedure: 'Root Canal Treatment', dentist: 'Dr. Santos', accessState: 'pending' },
  { id: 'P-0743', name: 'Lorna dela Cruz', dob: '1968-05-20', phone: '0915-xxx-xxxx', lastVisit: 'Jun 3, 2026', lastProcedure: 'Crown Placement', dentist: 'Dr. Reyes', accessState: 'denied' },
];

const DENTIST_OPTIONS = ['All Dentists', 'Dr. Reyes', 'Dr. Santos'];
const PROCEDURE_OPTIONS = ['All Procedures', 'Prophylaxis', 'Composite Restoration', 'Root Canal Treatment', 'Crown Placement', 'Extraction', 'Dental Examination'];

export default function Records({ onViewPatient }: Props) {
  const [query, setQuery] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('name-id');
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [accessStates, setAccessStates] = useState<Record<string, AccessState>>({});
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterProcedure, setFilterProcedure] = useState('All Procedures');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterDentist, setFilterDentist] = useState('All Dentists');

  const getState = (p: SearchResult): AccessState => accessStates[p.id] ?? p.accessState;

  const applyFilters = (list: SearchResult[]) => {
    return list.filter(r => {
      if (filterProcedure !== 'All Procedures' && r.lastProcedure !== filterProcedure) return false;
      if (filterDentist !== 'All Dentists' && r.dentist !== filterDentist) return false;
      return true;
    });
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const q = query.toLowerCase();
      const filtered = MOCK_RESULTS.filter(r => {
        if (searchField === 'name-id') {
          return r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
        } else if (searchField === 'phone') {
          return r.phone.replace(/-/g, '').includes(q.replace(/-/g, ''));
        } else {
          return r.dob.includes(q);
        }
      });
      setResults(applyFilters(filtered));
      setSearched(true);
      setLoading(false);
    }, 700);
  };

  const handleRequestAccess = (patient: SearchResult) => {
    setRequestingId(patient.id);
    setTimeout(() => {
      setAccessStates(p => ({ ...p, [patient.id]: 'pending' }));
      setRequestingId(null);
    }, 1200);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-clinical-900 font-display">Records Retrieval</h1>
        <p className="text-sm text-clinical-500 mt-0.5">
          Search and retrieve permitted patient data. Access to records requires patient authorization when not previously assigned.
        </p>
      </div>

      {/* Module purpose note */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        {[
          { icon: '🔍', label: 'Search', desc: 'Find patients by name or ID' },
          { icon: '🔒', label: 'Access Control', desc: 'Request and track patient authorization' },
          { icon: '📋', label: 'Retrieve', desc: 'Open patient profile when authorized' },
        ].map(item => (
          <div key={item.label} className="bg-white border border-clinical-200 rounded-xl px-3 py-2.5 flex items-start gap-2.5">
            <span className="text-base shrink-0">{item.icon}</span>
            <div>
              <p className="font-semibold text-clinical-800">{item.label}</p>
              <p className="text-clinical-400 mt-0.5 leading-tight">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-xl border border-clinical-200 p-5 space-y-4">
        {/* Search field selector */}
        <div>
          <label className="block text-xs font-semibold text-clinical-700 mb-2">Search By</label>
          <div className="flex gap-1 bg-clinical-100 rounded-lg p-1">
            {([
              { id: 'name-id' as SearchField, label: 'Name / Patient ID' },
              { id: 'phone' as SearchField, label: 'Phone' },
              { id: 'dob' as SearchField, label: 'Date of Birth' },
            ]).map(opt => (
              <button
                key={opt.id}
                onClick={() => { setSearchField(opt.id); setQuery(''); setSearched(false); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  searchField === opt.id
                    ? 'bg-white text-clinical-900 shadow-sm'
                    : 'text-clinical-500 hover:text-clinical-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Query input */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-clinical-400" />
            <input
              type={searchField === 'dob' ? 'date' : 'text'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={
                searchField === 'name-id' ? "e.g. 'Ana Reyes' or 'P-1042'..." :
                searchField === 'phone' ? "e.g. 09171234567" :
                undefined
              }
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-clinical-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-clinical-300"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {loading ? <IconLoader className="w-4 h-4" /> : <IconSearch className="w-4 h-4" />}
            Search
          </button>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              showFilters || filterProcedure !== 'All Procedures' || filterDentist !== 'All Dentists' || filterDateFrom || filterDateTo
                ? 'border-primary-400 bg-primary-50 text-primary-700'
                : 'border-clinical-200 text-clinical-600 hover:border-clinical-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Filters
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="border border-clinical-200 rounded-xl p-4 bg-clinical-50 space-y-3">
            <p className="text-xs font-semibold text-clinical-700">Filter Results</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-clinical-600 mb-1">Procedure</label>
                <select
                  value={filterProcedure}
                  onChange={e => setFilterProcedure(e.target.value)}
                  className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {PROCEDURE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-clinical-600 mb-1">Dentist</label>
                <select
                  value={filterDentist}
                  onChange={e => setFilterDentist(e.target.value)}
                  className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {DENTIST_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-clinical-600 mb-1">Last Visit — From</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => { setFilterProcedure('All Procedures'); setFilterDentist('All Dentists'); setFilterDateFrom(''); setFilterDateTo(''); }}
                className="text-xs text-clinical-500 hover:text-clinical-800 font-medium"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}

        <p className="text-[11px] text-clinical-400">
          Demo: try "Ana", "Maria", "Ramon", or "Lorna" · Only permitted records are accessible.
        </p>
      </div>

      {/* Results */}
      {searched && !loading && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <div className="bg-white rounded-xl border border-clinical-200 p-10 text-center">
              <IconSearch className="w-10 h-10 text-clinical-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-clinical-600">No patients found for "{query}"</p>
              <p className="text-xs text-clinical-400 mt-1">Try searching by full name or Patient ID</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-clinical-500">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
              {results.map(patient => {
                const state = getState(patient);
                return (
                  <PatientResultCard
                    key={patient.id}
                    patient={patient}
                    state={state}
                    isRequesting={requestingId === patient.id}
                    onRequestAccess={() => handleRequestAccess(patient)}
                    onOpenProfile={() => onViewPatient(patient.id, patient.name)}
                    onViewIntake={() => onViewPatient(patient.id, patient.name, 'intake')}
                  />
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {!searched && (
        <div className="bg-white rounded-xl border border-dashed border-clinical-200 p-10 text-center">
          <IconSearch className="w-10 h-10 text-clinical-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-clinical-500">Search for a patient above to retrieve records</p>
          <p className="text-xs text-clinical-400 mt-1">
            Patients assigned to you are immediately accessible. New patients require authorization.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Patient result card ─────────────────────────────────── */

function PatientResultCard({
  patient, state, isRequesting, onRequestAccess, onOpenProfile, onViewIntake
}: {
  patient: SearchResult;
  state: AccessState;
  isRequesting: boolean;
  onRequestAccess: () => void;
  onOpenProfile: () => void;
  onViewIntake: () => void;
}) {
  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all ${
      state === 'granted' ? 'border-success-100' :
      state === 'pending' ? 'border-primary-100' :
      state === 'denied' ? 'border-clinical-200' :
      'border-clinical-200'
    }`}>
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
          <IconUser className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-clinical-900">{patient.name}</p>
            <span className="text-[10px] font-mono text-clinical-400 bg-clinical-100 px-1.5 py-0.5 rounded">{patient.id}</span>
            {patient.alertCount && state === 'granted' && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-alert-600 bg-alert-50 border border-alert-100 px-1.5 py-0.5 rounded">
                <IconAlert className="w-2.5 h-2.5" /> {patient.alertCount} Alerts
              </span>
            )}
          </div>
          <p className="text-xs text-clinical-500">DOB: {patient.dob} · Last visit: {patient.lastVisit}</p>
        </div>

        {/* Access action */}
        {state === 'none' && (
          <button
            onClick={onRequestAccess}
            disabled={isRequesting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 text-white rounded-lg text-xs font-semibold hover:bg-primary-800 disabled:opacity-60 transition-colors"
          >
            {isRequesting
              ? <><IconLoader className="w-3.5 h-3.5" /> Sending...</>
              : <><IconLock className="w-3.5 h-3.5" /> Request Access</>}
          </button>
        )}
        {state === 'pending' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 border border-primary-100 rounded-lg text-xs font-medium">
            <IconClock className="w-3.5 h-3.5" /> Pending
          </div>
        )}
        {state === 'denied' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-clinical-100 text-clinical-500 border border-clinical-200 rounded-lg text-xs font-medium">
            <IconX className="w-3.5 h-3.5" /> Denied
          </div>
        )}
        {state === 'granted' && (
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-success-600 text-white rounded-lg text-xs font-semibold hover:bg-success-700 transition-colors"
          >
            <IconUnlock className="w-3.5 h-3.5" /> Open Profile <IconChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Status banners */}
      {state === 'pending' && (
        <div className="px-5 py-2.5 bg-primary-50 border-t border-primary-100 flex items-center gap-2">
          <IconClock className="w-4 h-4 text-primary-600 shrink-0" />
          <p className="text-xs text-primary-700 font-medium">Access Request Pending</p>
          <span className="text-[10px] text-primary-500">
            · Patient notified via SMS and portal. Awaiting authorization.
          </span>
        </div>
      )}
      {state === 'denied' && (
        <div className="px-5 py-2.5 bg-clinical-50 border-t border-clinical-200 flex items-center gap-2">
          <IconX className="w-4 h-4 text-clinical-400 shrink-0" />
          <p className="text-xs text-clinical-600 font-medium">Access Denied by Patient</p>
          <span className="text-[10px] text-clinical-400">· Event logged in audit trail.</span>
        </div>
      )}
      {state === 'granted' && (
        <div className="px-5 py-2.5 bg-success-50 border-t border-success-100 flex items-center gap-2 flex-wrap gap-y-1">
          <IconUnlock className="w-4 h-4 text-success-600 shrink-0" />
          <p className="text-xs text-success-700 font-medium">Access Granted</p>
          <span className="text-[10px] text-success-600">· Authorized by patient. Access logged.</span>
          <button
            onClick={onViewIntake}
            className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-primary-600 hover:text-primary-800"
          >
            View Intake & Alerts <IconChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
