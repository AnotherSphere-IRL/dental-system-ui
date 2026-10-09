import { useState } from 'react';
import DentalArchSVG, { type ToothCondition } from '../clinic/DentalArchSVG';
import { IconAlert } from '../icons';

/* ── Demo data (mirrors dentist-recorded chart) ─────────── */

const DEMO_CONDITIONS: Record<number, ToothCondition> = {
  1: 'missing', 3: 'crown', 14: 'restored', 16: 'missing',
  17: 'missing', 19: 'rct', 29: 'caries', 32: 'missing',
};

type EntryStatus = 'completed' | 'planned' | 'in-progress';

interface ChartEntry {
  tooth: number;
  procedure: string;
  date: string;
  dentist: string;
  status: EntryStatus;
  notes: string;
}

const DEMO_CHART_LOG: ChartEntry[] = [
  { tooth: 29, procedure: 'Composite Restoration', date: '2026-09-24', dentist: 'Dr. Reyes', status: 'planned', notes: 'Caries detected. Scheduled for next appointment.' },
  { tooth: 3, procedure: 'Crown Placement', date: '2024-08-15', dentist: 'Dr. Reyes', status: 'completed', notes: 'Full ceramic crown. No complications.' },
  { tooth: 14, procedure: 'Composite Restoration', date: '2024-06-20', dentist: 'Dr. Reyes', status: 'completed', notes: 'Class II composite, occlusal.' },
  { tooth: 19, procedure: 'Root Canal Treatment', date: '2023-11-10', dentist: 'Dr. Reyes', status: 'completed', notes: 'Pulp necrosis. 3-canal treatment. No post-op complications.' },
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

const CONDITION_LABELS: Record<ToothCondition, string> = {
  normal: 'Normal', caries: 'Caries / Decay', restored: 'Restored',
  crown: 'Crown', rct: 'Root Canal Done', implant: 'Implant', missing: 'Missing',
};

const STATUS_STYLES: Record<EntryStatus, string> = {
  completed: 'bg-success-50 text-success-700 border-success-100',
  planned: 'bg-warning-50 text-warning-700 border-warning-100',
  'in-progress': 'bg-primary-50 text-primary-700 border-primary-100',
};
const STATUS_LABELS: Record<EntryStatus, string> = {
  completed: 'Completed', planned: 'Planned', 'in-progress': 'In Progress',
};

const LEG_CROWN = 'M 2.5,8 L 2,14 Q 3.5,17 5.5,16.5 L 5.5,13.5 L 7,15 L 8.5,13.5 L 8.5,16.5 Q 10.5,17 12,14 L 11.5,8 Z';
const LEG_ROOT  = 'M 2.5,8 Q 2.5,4.5 4,1 Q 7,-0.5 10,1 Q 11.5,4.5 11.5,8 Z';

/* ── Component ─────────────────────────────────────────── */

interface Props {
  isDemo: boolean;
}

export default function PatientDentalChart({ isDemo }: Props) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const conditions = isDemo ? DEMO_CONDITIONS : {};
  const chartLog = isDemo ? DEMO_CHART_LOG : [];
  const selectedEntries = chartLog.filter(e => e.tooth === selectedTooth);
  const selectedCondition: ToothCondition = (selectedTooth ? conditions[selectedTooth] : undefined) ?? 'normal';

  const missingTeeth = Object.entries(conditions).filter(([, c]) => c === 'missing').map(([n]) => `#${n}`);
  const restoredTeeth = Object.entries(conditions).filter(([, c]) => ['restored', 'crown', 'rct', 'implant'].includes(c)).map(([n]) => `#${n}`);
  const cariesTeeth = Object.entries(conditions).filter(([, c]) => c === 'caries').map(([n]) => `#${n}`);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-primary-50 border border-primary-100 rounded-xl text-xs text-primary-700">
        <p className="font-semibold mb-0.5">Your Dental Chart</p>
        <p className="text-primary-600 leading-relaxed">
          This chart shows your dentist's documented clinical findings. You can view the status and remarks for any tooth.
          Only your dentist can make changes to this record.
        </p>
      </div>

      {/* Tooth map */}
      <div className="bg-white rounded-xl border border-clinical-200 p-4">
        <p className="text-xs font-semibold text-clinical-700 mb-1">Tooth Status Map</p>
        <p className="text-[10px] text-clinical-400 mb-3">
          Tap a tooth to view its documented status and dentist remarks.
        </p>
        <DentalArchSVG
          conditions={conditions}
          selected={selectedTooth}
          onToothClick={setSelectedTooth}
          compact
        />
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-clinical-100">
          {[
            { label: 'Normal',   fill: '#f8fafc', stroke: '#94a3b8' },
            { label: 'Caries',   fill: '#fef3c7', stroke: '#d97706' },
            { label: 'Restored', fill: '#dcfce7', stroke: '#16a34a' },
            { label: 'Crown',    fill: '#cffafe', stroke: '#0e7490' },
            { label: 'RCT Done', fill: '#fff7ed', stroke: '#b45309' },
            { label: 'Missing',  fill: 'none',    stroke: '#cbd5e1', opacity: 0.45, dash: '3,2' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-clinical-500">
              <svg width="14" height="18" viewBox="0 0 14 18" className="shrink-0">
                <path d={LEG_ROOT} fill={l.opacity ? 'none' : '#dde3ea'} stroke="#94a3b8" strokeWidth="0.8" opacity={l.opacity ?? 1} strokeDasharray={l.dash} />
                <path d={LEG_CROWN} fill={l.fill} stroke={l.stroke} strokeWidth="1.5" strokeLinejoin="round" opacity={l.opacity ?? 1} strokeDasharray={l.dash} />
              </svg>
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Tooth detail panel */}
      {selectedTooth && (
        <div className="bg-white rounded-xl border border-clinical-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary-700">#{selectedTooth}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-clinical-800">Tooth #{selectedTooth}</p>
              <p className="text-xs text-clinical-500">{TOOTH_LABELS[selectedTooth]} · {CONDITION_LABELS[selectedCondition]}</p>
            </div>
            <span className="text-[10px] font-medium text-clinical-400 bg-clinical-100 px-2 py-0.5 rounded">
              View Only
            </span>
          </div>

          {selectedEntries.length > 0 ? (
            <div className="space-y-2">
              {selectedEntries.map((entry, i) => (
                <div key={i} className="bg-clinical-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-clinical-800 flex-1">{entry.procedure}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLES[entry.status]}`}>
                      {STATUS_LABELS[entry.status]}
                    </span>
                  </div>
                  <p className="text-[10px] text-clinical-500">{entry.date} · {entry.dentist}</p>
                  {entry.notes && (
                    <div className="mt-2 p-2.5 bg-white rounded-lg border border-clinical-100">
                      <p className="text-[10px] font-semibold text-clinical-500 mb-0.5">Dentist's Remarks</p>
                      <p className="text-xs text-clinical-700 italic">"{entry.notes}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-clinical-400 italic bg-clinical-50 rounded-lg p-3">
              No clinical entries documented for this tooth yet.
            </p>
          )}
        </div>
      )}

      {/* Dental Status */}
      <div className="bg-white rounded-xl border border-clinical-200 p-4">
        <p className="text-sm font-semibold text-clinical-800 mb-1">Dental Status</p>
        <p className="text-[10px] text-clinical-400 mb-3 italic">
          Factual summary based on your dentist's documented findings. This is not an automated diagnosis.
          Your dentist retains full clinical judgment.
        </p>
        {isDemo ? (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Missing Teeth', value: missingTeeth.length ? missingTeeth.join(', ') : 'None', color: 'bg-clinical-400' },
              { label: 'Restored / Treated', value: restoredTeeth.length ? restoredTeeth.join(', ') : 'None', color: 'bg-success-600' },
              { label: 'Active Caries', value: cariesTeeth.length ? cariesTeeth.join(', ') : 'None', color: 'bg-alert-600' },
            ].map(s => (
              <div key={s.label} className="bg-clinical-50 rounded-lg p-2.5 border border-clinical-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${s.color} shrink-0`} />
                  <p className="text-[10px] font-semibold text-clinical-600 leading-tight">{s.label}</p>
                </div>
                <p className="text-xs text-clinical-800">{s.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-clinical-400">No dental findings documented yet.</p>
            <p className="text-[10px] text-clinical-400 mt-0.5">Dental status will be updated after your first clinical visit.</p>
          </div>
        )}
      </div>

      {/* Treatment history */}
      {chartLog.length > 0 ? (
        <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-clinical-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-clinical-700">Treatment History</p>
            <span className="text-[10px] text-clinical-400">{chartLog.length} entries</span>
          </div>
          <div className="divide-y divide-clinical-50">
            {chartLog.map((entry, i) => (
              <button
                key={i}
                onClick={() => setSelectedTooth(entry.tooth)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-clinical-50 transition-colors text-left"
              >
                <span className="w-7 h-7 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-[11px] font-bold text-primary-700 shrink-0">
                  #{entry.tooth}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-clinical-800">{entry.procedure}</p>
                  <p className="text-[10px] text-clinical-500">{entry.date} · {entry.dentist}</p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLES[entry.status]} shrink-0`}>
                  {STATUS_LABELS[entry.status]}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-clinical-200 p-8 text-center">
          <p className="text-xs font-medium text-clinical-500">No treatment history yet</p>
          <p className="text-[10px] text-clinical-400 mt-1">
            Your treatment history will appear here after your first clinical visit.
          </p>
        </div>
      )}

      {/* Active medical alerts (demo only) */}
      {isDemo && cariesTeeth.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-warning-50 border border-warning-100 rounded-xl">
          <IconAlert className="w-4 h-4 text-warning-600 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-warning-700">Active Treatment Needed</p>
            <p className="text-[10px] text-warning-600">Caries documented on {cariesTeeth.join(', ')} — see your dentist.</p>
          </div>
        </div>
      )}
    </div>
  );
}
