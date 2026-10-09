import { useState } from 'react';
import { IconAlert, IconCheck, IconClock } from '../icons';
import DentalArchSVG, { type ToothCondition } from './DentalArchSVG';
import { useClinic } from '../../context/ClinicContext';

// Supply name → inventory item ID mapping
const SUPPLY_ITEM_MAP: Record<string, string> = {
  'Composite Resin A2':    'I01',
  'Composite Resin A3':    'I02',
  'Bonding Agent':         'I03',
  'Anesthetic Carpule 2%': 'I04',
  'Dental Cement':         'I05',
  'Rubber Dam':            'I06',
  'Matrix Band':           'I07',
  'Gloves (pair)':         'I08',
  'Cotton Rolls':          'I09',
  'Gauze Pads':            'I10',
};
type TreatmentStatus = 'planned' | 'in-progress' | 'completed';

interface ToothEntry {
  condition: ToothCondition;
  procedure: string;
  notes: string;
  supplies: string[];
  date: string;
  time: string;
  treatmentStatus: TreatmentStatus;
}

const PROCEDURES = [
  'Dental Examination', 'Prophylaxis', 'Composite Restoration',
  'Amalgam Restoration', 'Root Canal Treatment', 'Crown Placement',
  'Extraction', 'Implant Placement', 'Sealant Application', 'Bleaching'
];

interface ClinicalTemplate {
  id: string;
  label: string;
  condition: ToothCondition;
  procedure: string;
  treatmentStatus: TreatmentStatus;
  notes: string;
  supplies: string[];
}

const CLINICAL_TEMPLATES: ClinicalTemplate[] = [
  {
    id: 'tpl-exam',
    label: 'Routine Exam',
    condition: 'normal',
    procedure: 'Dental Examination',
    treatmentStatus: 'completed',
    notes: 'Routine clinical examination performed. No acute findings noted.',
    supplies: ['Gloves (pair)', 'Cotton Rolls'],
  },
  {
    id: 'tpl-prophy',
    label: 'Prophylaxis',
    condition: 'normal',
    procedure: 'Prophylaxis',
    treatmentStatus: 'completed',
    notes: 'Full-mouth prophylaxis completed. Plaque and calculus deposits removed.',
    supplies: ['Gloves (pair)', 'Gauze Pads', 'Cotton Rolls'],
  },
  {
    id: 'tpl-composite',
    label: 'Composite Fill',
    condition: 'restored',
    procedure: 'Composite Restoration',
    treatmentStatus: 'completed',
    notes: 'Caries removed and cavity prepared. Composite resin restoration placed.',
    supplies: ['Composite Resin A2', 'Bonding Agent', 'Anesthetic Carpule 2%', 'Matrix Band', 'Rubber Dam', 'Gloves (pair)'],
  },
  {
    id: 'tpl-rct',
    label: 'Root Canal',
    condition: 'rct',
    procedure: 'Root Canal Treatment',
    treatmentStatus: 'completed',
    notes: 'Pulp extirpated. Canal shaping and obturation completed. No post-op complications.',
    supplies: ['Anesthetic Carpule 2%', 'Dental Cement', 'Rubber Dam', 'Cotton Rolls', 'Gauze Pads', 'Gloves (pair)'],
  },
  {
    id: 'tpl-extraction',
    label: 'Extraction',
    condition: 'missing',
    procedure: 'Extraction',
    treatmentStatus: 'completed',
    notes: 'Tooth extracted under local anesthesia. Post-extraction instructions provided to patient.',
    supplies: ['Anesthetic Carpule 2%', 'Gauze Pads', 'Cotton Rolls', 'Gloves (pair)'],
  },
  {
    id: 'tpl-crown',
    label: 'Crown Placement',
    condition: 'crown',
    procedure: 'Crown Placement',
    treatmentStatus: 'completed',
    notes: 'Definitive crown cemented. Occlusion checked and adjusted.',
    supplies: ['Dental Cement', 'Cotton Rolls', 'Gauze Pads', 'Gloves (pair)'],
  },
];

const SUPPLIES = [
  'Composite Resin A2', 'Composite Resin A3', 'Bonding Agent',
  'Anesthetic Carpule 2%', 'Dental Cement', 'Rubber Dam',
  'Matrix Band', 'Gloves (pair)', 'Cotton Rolls', 'Gauze Pads'
];

const TOOTH_LABELS: Record<number, string> = {
  1: 'UR 3rd Molar', 2: 'UR 2nd Molar', 3: 'UR 1st Molar',
  4: 'UR 2nd Premolar', 5: 'UR 1st Premolar', 6: 'UR Canine',
  7: 'UR Lateral Incisor', 8: 'UR Central Incisor',
  9: 'UL Central Incisor', 10: 'UL Lateral Incisor', 11: 'UL Canine',
  12: 'UL 1st Premolar', 13: 'UL 2nd Premolar', 14: 'UL 1st Molar',
  15: 'UL 2nd Molar', 16: 'UL 3rd Molar',
  17: 'LL 3rd Molar', 18: 'LL 2nd Molar', 19: 'LL 1st Molar',
  20: 'LL 2nd Premolar', 21: 'LL 1st Premolar', 22: 'LL Canine',
  23: 'LL Lateral Incisor', 24: 'LL Central Incisor',
  25: 'LR Central Incisor', 26: 'LR Lateral Incisor', 27: 'LR Canine',
  28: 'LR 1st Premolar', 29: 'LR 2nd Premolar', 30: 'LR 1st Molar',
  31: 'LR 2nd Molar', 32: 'LR 3rd Molar',
};

const INITIAL_CONDITIONS: Record<number, ToothCondition> = {
  3: 'crown', 14: 'restored', 19: 'rct', 29: 'caries', 32: 'missing', 1: 'missing', 16: 'missing', 17: 'missing'
};

const CHART_LOG: Array<{ tooth: number; procedure: string; date: string; dentist: string; status: TreatmentStatus }> = [
  { tooth: 3, procedure: 'Crown Placement', date: '2024-08-15', dentist: 'Dr. Reyes', status: 'completed' },
  { tooth: 14, procedure: 'Composite Restoration', date: '2024-06-20', dentist: 'Dr. Reyes', status: 'completed' },
  { tooth: 19, procedure: 'Root Canal Treatment', date: '2023-11-10', dentist: 'Dr. Reyes', status: 'completed' },
  { tooth: 29, procedure: 'Composite Restoration', date: '2026-09-24', dentist: 'Dr. Reyes', status: 'planned' },
];

export default function Charting() {
  const { inventory, getStockStatus, deductInventory } = useClinic();
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [conditions, setConditions] = useState<Record<number, ToothCondition>>(INITIAL_CONDITIONS);
  const [chartLog, setChartLog] = useState(CHART_LOG);
  const [saving, setSaving] = useState(false);
  const [savedTooth, setSavedTooth] = useState<number | null>(null);

  const [form, setForm] = useState({
    condition: 'normal' as ToothCondition,
    treatmentStatus: 'completed' as TreatmentStatus,
    procedure: '',
    notes: '',
    supplies: [] as string[],
  });

  const handleToothClick = (n: number) => {
    setSelectedTooth(n);
    setSavedTooth(null);
    setForm({
      condition: conditions[n] ?? 'normal',
      treatmentStatus: 'completed',
      procedure: '',
      notes: '',
      supplies: [],
    });
  };

  const applyTemplate = (tpl: ClinicalTemplate) => {
    setForm({
      condition: tpl.condition,
      treatmentStatus: tpl.treatmentStatus,
      procedure: tpl.procedure,
      notes: tpl.notes,
      supplies: tpl.supplies,
    });
  };

  const handleSave = () => {
    if (!selectedTooth) return;
    setSaving(true);
    setTimeout(() => {
      setConditions(p => ({ ...p, [selectedTooth]: form.condition }));
      setChartLog(p => [
        {
          tooth: selectedTooth,
          procedure: form.procedure || 'Dental Examination',
          date: new Date().toISOString().slice(0, 10),
          dentist: 'Dr. Reyes',
          status: form.treatmentStatus,
        },
        ...p,
      ]);
      // M17: deduct selected supplies from shared inventory.
      // Patient = Jose dela Cruz (P-2001); performer = Dr. Reyes.
      const itemIds = form.supplies.map(s => SUPPLY_ITEM_MAP[s]).filter((x): x is string => Boolean(x));
      if (itemIds.length > 0) {
        deductInventory(
          itemIds,
          'P-2001',
          form.procedure || 'Dental Examination',
          'Dr. Reyes',
        );
      }

      setSaving(false);
      setSavedTooth(selectedTooth);
    }, 800);
  };


  const treatedTeeth = Object.entries(conditions).filter(([, c]) => c !== 'normal');
  const missingTeeth = treatedTeeth.filter(([, c]) => c === 'missing').map(([n]) => n);
  const restoredTeeth = treatedTeeth.filter(([, c]) => ['restored', 'crown', 'rct', 'implant'].includes(c)).map(([n]) => n);
  const cariesTeeth = treatedTeeth.filter(([, c]) => c === 'caries').map(([n]) => n);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-clinical-900 font-display">Digital Dental Charting</h1>
          <p className="text-sm text-clinical-500 mt-0.5">Patient: Jose dela Cruz · DOB: 1988-03-12 · Last Visit: Sep 18, 2026</p>
        </div>
        <div className="flex items-center gap-2">
          {MEDICAL_ALERT}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Tooth Map + Form */}
        <div className="xl:col-span-2 space-y-4">
          {/* Odontogram */}
          <div className="bg-white rounded-xl border border-clinical-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-clinical-800">Universal Tooth Numbering — Click to Chart</h2>
            </div>

            <DentalArchSVG
              conditions={conditions}
              selected={selectedTooth}
              onToothClick={handleToothClick}
            />

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-clinical-100">
              {LEGEND.map(l => (
                <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-clinical-500">
                  <svg width="14" height="18" viewBox="0 0 14 18" className="shrink-0">
                    <path d={l.crownPath} fill={l.fill} stroke={l.stroke} strokeWidth="1.5" strokeLinejoin="round" opacity={l.opacity ?? 1} strokeDasharray={l.dash} />
                    <path d={l.rootPath} fill={l.opacity ? 'none' : '#dde3ea'} stroke="#94a3b8" strokeWidth="0.8" strokeLinejoin="round" opacity={l.opacity ?? 1} strokeDasharray={l.dash} />
                  </svg>
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          {/* Quick-fill Clinical Templates */}
          <div className="bg-white rounded-xl border border-clinical-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-clinical-800">Quick-Fill Clinical Templates</h2>
                <p className="text-[10px] text-clinical-400 mt-0.5">Select a template to pre-fill the form below. Edit fields before saving.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CLINICAL_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => selectedTooth && applyTemplate(tpl)}
                  disabled={!selectedTooth}
                  title={selectedTooth ? `Apply: ${tpl.label}` : 'Select a tooth first'}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${
                    selectedTooth
                      ? 'border-clinical-200 bg-clinical-50 hover:border-primary-400 hover:bg-primary-50 cursor-pointer'
                      : 'border-clinical-100 bg-clinical-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className="text-base leading-none">
                    {tpl.id === 'tpl-exam' ? '🔍' : tpl.id === 'tpl-prophy' ? '🦷' : tpl.id === 'tpl-composite' ? '🔵' : tpl.id === 'tpl-rct' ? '⚙️' : tpl.id === 'tpl-extraction' ? '❌' : '👑'}
                  </span>
                  <span className="text-[10px] font-medium text-clinical-700 leading-tight">{tpl.label}</span>
                </button>
              ))}
            </div>
            {!selectedTooth && (
              <p className="text-[10px] text-clinical-400 mt-2 text-center">← Select a tooth on the chart above to enable templates</p>
            )}
          </div>

          {/* Charting Form */}
          {selectedTooth ? (
            <div className="bg-white rounded-xl border border-clinical-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-700">#{selectedTooth}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-clinical-800">Tooth #{selectedTooth}</p>
                  <p className="text-xs text-clinical-500">{TOOTH_LABELS[selectedTooth]}</p>
                </div>
                {savedTooth === selectedTooth && (
                  <div className="ml-auto flex items-center gap-1.5 text-success-600 text-xs font-medium">
                    <IconCheck className="w-4 h-4" /> Entry Saved · Inventory Deducted
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-clinical-700 mb-1">Dental Condition</label>
                  <select
                    value={form.condition}
                    onChange={e => setForm(p => ({ ...p, condition: e.target.value as ToothCondition }))}
                    className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="caries">Caries / Decay</option>
                    <option value="restored">Restored</option>
                    <option value="crown">Crown</option>
                    <option value="rct">Root Canal Done</option>
                    <option value="implant">Implant</option>
                    <option value="missing">Missing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-clinical-700 mb-1">Treatment Status</label>
                  <select
                    value={form.treatmentStatus}
                    onChange={e => setForm(p => ({ ...p, treatmentStatus: e.target.value as TreatmentStatus }))}
                    className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="planned">Planned</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-clinical-700 mb-1">Procedure Performed</label>
                  <select
                    value={form.procedure}
                    onChange={e => setForm(p => ({ ...p, procedure: e.target.value }))}
                    className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">— Select Procedure —</option>
                    {PROCEDURES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-clinical-700 mb-2">Supplies Used</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {SUPPLIES.map(s => {
                    const itemId = SUPPLY_ITEM_MAP[s];
                    const invItem = itemId ? inventory.find(i => i.id === itemId) : null;
                    const stockStatus = invItem ? getStockStatus(invItem) : null;
                    const qty = invItem?.quantity ?? null;
                    return (
                      <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={form.supplies.includes(s)}
                          onChange={e => {
                            setForm(p => ({
                              ...p,
                              supplies: e.target.checked
                                ? [...p.supplies, s]
                                : p.supplies.filter(x => x !== s)
                            }));
                          }}
                          className="w-3.5 h-3.5 accent-primary-700"
                          disabled={qty !== null && qty <= 0}
                        />
                        <span className={`leading-tight ${qty !== null && qty <= 0 ? 'text-clinical-300' : 'text-clinical-700 group-hover:text-clinical-900'}`}>{s}</span>
                        {qty !== null && (
                          <span className={`ml-auto text-[9px] font-bold shrink-0 ${
                            stockStatus === 'critical' ? 'text-alert-600' :
                            stockStatus === 'low'      ? 'text-warning-600' :
                            'text-clinical-400'
                          }`}>{qty}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-clinical-700 mb-1">Clinical Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  placeholder="Enter clinical observations, findings, and any special instructions..."
                  className="w-full text-sm border border-clinical-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none placeholder:text-clinical-300"
                />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-clinical-400">
                  <IconClock className="w-3.5 h-3.5" />
                  <span>Auto-timestamp on save</span>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 disabled:opacity-60 transition-all"
                >
                  {saving ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                      </svg>
                      Saving Entry...
                    </>
                  ) : 'Save Chart Entry'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-clinical-200 p-8 text-center">
              <p className="text-sm text-clinical-400">Select a tooth on the chart to record findings, procedures, and supplies used.</p>
            </div>
          )}
        </div>

        {/* Right: Dental Status + Log */}
        <div className="space-y-4">
          {/* Dental Status Summary */}
          <div className="bg-white rounded-xl border border-clinical-200 p-4">
            <h3 className="text-sm font-semibold text-clinical-800 mb-3">Dental Status Summary</h3>
            <p className="text-[10px] text-clinical-400 mb-3 italic">
              Factual compilation of documented findings. Not an automated diagnosis.
            </p>
            <div className="space-y-2">
              <SummaryRow
                color="bg-clinical-300"
                label="Missing Teeth"
                value={missingTeeth.length > 0 ? `#${missingTeeth.join(', #')}` : 'None documented'}
              />
              <SummaryRow
                color="bg-success-600"
                label="Restored / Treated"
                value={restoredTeeth.length > 0 ? `#${restoredTeeth.join(', #')}` : 'None documented'}
              />
              <SummaryRow
                color="bg-alert-600"
                label="Active Caries"
                value={cariesTeeth.length > 0 ? `#${cariesTeeth.join(', #')}` : 'None documented'}
              />
            </div>
          </div>

          {/* Chronological Chart Log */}
          <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-clinical-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-clinical-800">Chart History</h3>
              <span className="text-[10px] text-clinical-400">{chartLog.length} entries</span>
            </div>
            <div className="divide-y divide-clinical-50 max-h-64 overflow-y-auto">
              {chartLog.map((entry, i) => (
                <div key={i} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-primary-50 flex items-center justify-center text-[10px] font-bold text-primary-700 shrink-0">
                      #{entry.tooth}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-clinical-800 truncate">{entry.procedure}</p>
                      <p className="text-[10px] text-clinical-400">{entry.date} · {entry.dentist}</p>
                    </div>
                    <TreatmentBadge status={entry.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function TreatmentBadge({ status }: { status: TreatmentStatus }) {
  const styles: Record<TreatmentStatus, string> = {
    'completed': 'bg-success-50 text-success-700 border-success-100',
    'in-progress': 'bg-primary-50 text-primary-700 border-primary-100',
    'planned': 'bg-warning-50 text-warning-700 border-warning-100',
  };
  const labels: Record<TreatmentStatus, string> = {
    'completed': 'Done',
    'in-progress': 'In Progress',
    'planned': 'Planned',
  };
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function SummaryRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`w-2 h-2 rounded-full ${color} mt-1 shrink-0`} />
      <div>
        <p className="text-[10px] font-semibold text-clinical-600">{label}</p>
        <p className="text-xs text-clinical-800">{value}</p>
      </div>
    </div>
  );
}

// Legend miniature paths (origin-shifted so everything is in positive coords)
// Crown from y=8 downward, root from y=8 upward
const LEG_CROWN = 'M 2.5,8 L 2,14 Q 3.5,17 5.5,16.5 L 5.5,13.5 L 7,15 L 8.5,13.5 L 8.5,16.5 Q 10.5,17 12,14 L 11.5,8 Z';
const LEG_ROOT  = 'M 2.5,8 Q 2.5,4.5 4,1 Q 7,-0.5 10,1 Q 11.5,4.5 11.5,8 Z';

const LEGEND = [
  { label: 'Normal',   fill: '#f8fafc', stroke: '#94a3b8', crownPath: LEG_CROWN, rootPath: LEG_ROOT },
  { label: 'Caries',   fill: '#fef3c7', stroke: '#d97706', crownPath: LEG_CROWN, rootPath: LEG_ROOT },
  { label: 'Restored', fill: '#dcfce7', stroke: '#16a34a', crownPath: LEG_CROWN, rootPath: LEG_ROOT },
  { label: 'Crown',    fill: '#cffafe', stroke: '#0e7490', crownPath: LEG_CROWN, rootPath: LEG_ROOT },
  { label: 'RCT Done', fill: '#fff7ed', stroke: '#b45309', crownPath: LEG_CROWN, rootPath: LEG_ROOT },
  { label: 'Missing',  fill: 'none',   stroke: '#cbd5e1', crownPath: LEG_CROWN, rootPath: LEG_ROOT, opacity: 0.45, dash: '3,2' },
];

const MEDICAL_ALERT = (
  <div className="flex items-center gap-2 px-3 py-2 bg-alert-50 border border-alert-100 rounded-lg">
    <IconAlert className="w-4 h-4 text-alert-600 shrink-0" />
    <span className="text-xs font-semibold text-alert-700">Medical Alert Active</span>
    <span className="text-[10px] text-alert-500">See dashboard</span>
  </div>
);
