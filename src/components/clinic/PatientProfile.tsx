import { useState, useRef } from 'react';
import {
  IconAlert, IconCheck, IconUser, IconImage,
  IconUpload, IconLoader, IconX
} from '../icons';
import DentalArchSVG, { type ToothCondition } from './DentalArchSVG';

export type ProfileTab = 'identity' | 'intake' | 'charts' | 'imaging';

interface Props {
  patientId: string;
  patientName: string;
  initialTab?: ProfileTab;
  onBack: () => void;
}

/* ── Mock patient data ─────────────────────────────────── */

const PATIENT = {
  id: 'P-1042',
  name: 'Ana Kristina Reyes',
  dob: '1990-07-22',
  age: 36,
  sex: 'Female',
  address: '45 Sampaguita St., Quezon City, Metro Manila',
  phone: '0917-xxx-xxxx',
  email: 'ana.reyes@email.com',
  registeredDate: 'March 15, 2023',
  lastVisit: 'September 10, 2026',
  emergencyContact: 'Ramon Reyes (Spouse) · 0918-xxx-xxxx',
  bloodType: 'O+',
};

interface IntakeAnswer {
  question: string;
  answer: string;
  detail?: string;
  alertRule?: string;
}

const INTAKE_ANSWERS: IntakeAnswer[] = [
  { question: 'Known allergies to medications?', answer: 'Yes', detail: 'Penicillin (anaphylactic reaction), Sulfa drugs', alertRule: 'Patient reported medication allergy: Penicillin (anaphylaxis), Sulfa drugs' },
  { question: 'Currently taking medications/supplements?', answer: 'Yes', detail: 'Amlodipine 5mg (daily), Metformin 500mg (daily)', alertRule: 'Patient is currently taking medications: Amlodipine 5mg, Metformin 500mg' },
  { question: 'Diagnosed with diabetes or blood sugar condition?', answer: 'Yes', detail: 'Type 2 Diabetes', alertRule: 'Patient reported history of type 2 diabetes' },
  { question: 'High blood pressure (hypertension)?', answer: 'Yes', detail: 'On Amlodipine 5mg daily', alertRule: 'Patient reported hypertension (on Amlodipine 5mg)' },
  { question: 'Heart disease, pacemaker, or cardiac conditions?', answer: 'No' },
  { question: 'Bleeding disorders or blood-thinning medications?', answer: 'No' },
  { question: 'Currently pregnant or nursing?', answer: 'No' },
  { question: 'Asthma, COPD, or respiratory conditions?', answer: 'No' },
  { question: 'Adverse reaction to local anesthesia?', answer: 'No' },
  { question: 'Smokes or uses tobacco/vape?', answer: 'No' },
  { question: 'Hospitalized or surgery in past 12 months?', answer: 'No' },
  { question: 'Last dental visit', answer: 'Less than 6 months ago' },
  { question: 'Dental X-rays taken in past year?', answer: 'Yes' },
  { question: 'Dental anxiety or fear of procedures?', answer: 'No' },
  { question: 'Current tooth pain, sensitivity, or discomfort?', answer: 'Yes', detail: 'Occasional sensitivity in upper right area (teeth #3-5) when consuming cold beverages' },
  { question: 'Primary reason for visit', answer: 'Routine cleaning and follow-up on crown at tooth #3' },
  { question: 'Anything else the dentist should know?', answer: '—' },
];

const GENERATED_ALERTS = INTAKE_ANSWERS.filter(a => a.alertRule);

const TOOTH_CONDITIONS: Record<number, ToothCondition> = {
  1: 'missing', 3: 'crown', 14: 'restored', 16: 'missing', 17: 'missing', 19: 'rct', 29: 'caries', 32: 'missing'
};

type TreatmentStatus = 'completed' | 'planned' | 'in-progress';
const CHART_LOG: Array<{
  tooth: number; procedure: string; date: string; dentist: string; status: TreatmentStatus; notes?: string;
}> = [
  { tooth: 29, procedure: 'Composite Restoration', date: '2026-09-24', dentist: 'Dr. Reyes', status: 'planned', notes: 'Caries detected. Scheduled for next appointment.' },
  { tooth: 3, procedure: 'Crown Placement', date: '2024-08-15', dentist: 'Dr. Reyes', status: 'completed', notes: 'Full ceramic crown. No complications.' },
  { tooth: 14, procedure: 'Composite Restoration', date: '2024-06-20', dentist: 'Dr. Reyes', status: 'completed', notes: 'Class II composite, occlusal.' },
  { tooth: 19, procedure: 'Root Canal Treatment', date: '2023-11-10', dentist: 'Dr. Reyes', status: 'completed', notes: 'Pulp necrosis. 3-canal treatment. No post-op complications.' },
];

const XRAY_HISTORY = [
  { name: 'Panoramic X-ray (OPG)', date: 'Sep 10, 2026', type: 'OPG', uploader: 'Carlo Bautista (Staff)' },
  { name: 'Periapical Radiograph #19', date: 'Jul 15, 2026', type: 'PA', uploader: 'Carlo Bautista (Staff)' },
];

/* ── Component ─────────────────────────────────────────── */

export default function PatientProfile({ patientId, patientName, initialTab = 'identity', onBack }: Props) {
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [uploadState, setUploadState] = useState<'idle' | 'validating' | 'error' | 'success'>('idle');
  const [uploadedFile, setUploadedFile] = useState('');
  const [xrays, setXrays] = useState(XRAY_HISTORY);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const patientFileRef = useRef<HTMLInputElement>(null);
  const [patientUploadState, setPatientUploadState] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [patientUploadedFile, setPatientUploadedFile] = useState('');

  const handleUpload = (file: File) => {
    const allowed = ['image/jpeg', 'image/png'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    setUploadState('validating');
    setTimeout(() => {
      if (!allowed.includes(file.type) && ext !== 'dcm') {
        setUploadState('error');
        return;
      }
      setUploadState('success');
      setUploadedFile(file.name);
      setXrays(p => [{ name: file.name, date: 'Today', type: 'CLN', uploader: 'Dr. Reyes (Clinic)' }, ...p]);
    }, 1100);
  };

  const handlePatientUpload = (file: File) => {
    const allowed = ['image/jpeg', 'image/png'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    setPatientUploadState('validating');
    setTimeout(() => {
      if (!allowed.includes(file.type) && ext !== 'dcm') {
        setPatientUploadState('error');
        return;
      }
      setPatientUploadState('success');
      setPatientUploadedFile(file.name);
      setXrays(p => [{ name: file.name, date: 'Today', type: 'PAT', uploader: 'Ana Kristina Reyes (Patient Portal)' }, ...p]);
    }, 1100);
  };

  const tabs: { id: ProfileTab; label: string; badge?: number }[] = [
    { id: 'identity', label: 'Identity' },
    { id: 'intake', label: 'Intake & Alerts', badge: GENERATED_ALERTS.length },
    { id: 'charts', label: 'Dental Charts' },
    { id: 'imaging', label: 'Imaging', badge: xrays.length },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back + header */}
      <div className="flex items-start gap-4 mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-clinical-500 hover:text-clinical-800 font-medium mt-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Patients
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center">
              <IconUser className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-clinical-900 font-display">{patientName}</h1>
                <span className="text-xs font-mono text-clinical-400 bg-clinical-100 px-1.5 py-0.5 rounded">{patientId}</span>
                {GENERATED_ALERTS.length > 0 && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-alert-50 border border-alert-100 text-alert-700 text-[10px] font-bold rounded">
                    <IconAlert className="w-3 h-3" /> {GENERATED_ALERTS.length} ALERTS
                  </span>
                )}
              </div>
              <p className="text-xs text-clinical-500">DOB: {PATIENT.dob} · Last visit: {PATIENT.lastVisit}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-clinical-100 rounded-xl p-1 mb-5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-white text-clinical-900 shadow-sm'
                : 'text-clinical-500 hover:text-clinical-700'
            }`}
          >
            {tab.label}
            {tab.badge ? (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab.id === 'intake'
                  ? 'bg-alert-100 text-alert-700'
                  : 'bg-primary-100 text-primary-700'
              }`}>
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Identity Tab ────────────────────────────────── */}
      {activeTab === 'identity' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Section title="Patient Information">
            <Grid rows={[
              { label: 'Full Name', value: PATIENT.name },
              { label: 'Patient ID', value: PATIENT.id },
              { label: 'Date of Birth', value: PATIENT.dob },
              { label: 'Age', value: String(PATIENT.age) },
              { label: 'Sex', value: PATIENT.sex },
              { label: 'Blood Type', value: PATIENT.bloodType },
            ]} />
          </Section>
          <Section title="Contact & Registration">
            <Grid rows={[
              { label: 'Mobile', value: PATIENT.phone },
              { label: 'Email', value: PATIENT.email },
              { label: 'Address', value: PATIENT.address },
              { label: 'Emergency Contact', value: PATIENT.emergencyContact },
              { label: 'Registered', value: PATIENT.registeredDate },
              { label: 'Last Visit', value: PATIENT.lastVisit },
            ]} />
          </Section>
        </div>
      )}

      {/* ── Intake & Alerts Tab ─────────────────────────── */}
      {activeTab === 'intake' && (
        <div className="space-y-5">
          {/* Generated Medical Alerts */}
          <div className="bg-white rounded-xl border border-alert-100 overflow-hidden">
            <div className="px-4 py-3 bg-alert-50 border-b border-alert-100 flex items-center gap-2">
              <IconAlert className="w-4 h-4 text-alert-600" />
              <h3 className="text-sm font-semibold text-alert-700">Generated Medical Alerts</h3>
              <span className="ml-auto text-[10px] font-bold bg-alert-600 text-white px-1.5 py-0.5 rounded-full">
                {GENERATED_ALERTS.length}
              </span>
            </div>
            <div className="divide-y divide-alert-50">
              {GENERATED_ALERTS.map((a, i) => (
                <div key={i} className="px-4 py-3">
                  <p className="text-xs font-semibold text-alert-700">
                    ⚠ Medical Alert: {a.alertRule}
                  </p>
                  {a.detail && (
                    <p className="text-xs text-clinical-700 mt-0.5 pl-4">Patient stated: "{a.detail}"</p>
                  )}
                  <p className="text-[10px] text-clinical-400 mt-1 pl-4">
                    Source: Patient intake form · {PATIENT.lastVisit}
                  </p>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 bg-clinical-50 border-t border-clinical-100">
              <p className="text-[10px] text-clinical-500">
                These alerts are generated from rule-based evaluation of patient-provided responses and are not clinical diagnoses.
                Review the full intake responses below for context.
              </p>
            </div>
          </div>

          {/* Full intake responses */}
          <Section title="Full Intake Responses" subtitle={`Submitted ${PATIENT.lastVisit}`}>
            <div className="divide-y divide-clinical-50">
              {['Medical History', 'Dental History', 'Chief Complaint'].map((sectionLabel, si) => {
                const sectionAnswers = INTAKE_ANSWERS.slice(
                  si === 0 ? 0 : si === 1 ? 11 : 15,
                  si === 0 ? 11 : si === 1 ? 15 : 17
                );
                return (
                  <div key={sectionLabel} className="pt-3 pb-2">
                    <p className="text-[10px] font-bold text-clinical-500 uppercase tracking-wider mb-2 px-0">{sectionLabel}</p>
                    <div className="space-y-2">
                      {sectionAnswers.map((item, i) => (
                        <div key={i} className={`px-3 py-2 rounded-lg ${
                          item.alertRule ? 'bg-alert-50 border border-alert-100' : 'bg-clinical-50'
                        }`}>
                          <div className="flex items-start gap-1.5">
                            {item.alertRule && <IconAlert className="w-3 h-3 text-alert-500 mt-0.5 shrink-0" />}
                            <p className="text-[10px] text-clinical-500 flex-1">{item.question}</p>
                          </div>
                          <p className={`text-xs font-semibold mt-0.5 ${item.alertRule ? 'text-alert-700 pl-4' : 'text-clinical-800 pl-0'}`}>
                            {item.answer}
                          </p>
                          {item.detail && (
                            <p className="text-[11px] text-clinical-600 mt-0.5 pl-4 italic">"{item.detail}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      )}

      {/* ── Dental Charts Tab ───────────────────────────── */}
      {activeTab === 'charts' && (
        <div className="space-y-5">
          {/* Tooth Status Map — read-only arch view */}
          <Section title="Tooth Status Map" subtitle="Universal Tooth Numbering System · Click Charting module to edit">
            <p className="text-[10px] text-clinical-500 mb-2">
              Tooth identification uses the Universal Tooth Numbering System (1–32). Conditions reflect documented clinical entries.
            </p>
            <DentalArchSVG
              conditions={TOOTH_CONDITIONS}
              compact
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-clinical-100">
              {[
                { label: 'Normal',   fill: '#f8fafc', stroke: '#94a3b8' },
                { label: 'Caries',   fill: '#fef3c7', stroke: '#d97706' },
                { label: 'Restored', fill: '#dcfce7', stroke: '#16a34a' },
                { label: 'Crown',    fill: '#cffafe', stroke: '#0e7490' },
                { label: 'RCT Done', fill: '#fff7ed', stroke: '#b45309' },
                { label: 'Missing',  fill: 'none',   stroke: '#cbd5e1', opacity: 0.45, dash: '3,2' },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-clinical-500">
                  <svg width="14" height="18" viewBox="0 0 14 18">
                    <path
                      d="M 2.5,8 Q 2.5,4.5 4,1 Q 7,-0.5 10,1 Q 11.5,4.5 11.5,8 Z"
                      fill={l.opacity ? 'none' : '#dde3ea'}
                      stroke="#94a3b8"
                      strokeWidth="0.8"
                      strokeLinejoin="round"
                      opacity={l.opacity ?? 1}
                      strokeDasharray={l.dash}
                    />
                    <path
                      d="M 2.5,8 L 2,14 Q 3.5,17 5.5,16.5 L 5.5,13.5 L 7,15 L 8.5,13.5 L 8.5,16.5 Q 10.5,17 12,14 L 11.5,8 Z"
                      fill={l.fill}
                      stroke={l.stroke}
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      opacity={l.opacity ?? 1}
                      strokeDasharray={l.dash}
                    />
                  </svg>
                  {l.label}
                </span>
              ))}
            </div>
          </Section>

          {/* Dental Status Summary */}
          <Section title="Dental Status Summary" subtitle="Factual compilation of documented findings — not an automated diagnosis">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Missing Teeth', value: '#1, #16, #17, #32', color: 'bg-clinical-400' },
                { label: 'Restored / Treated', value: '#3 (Crown), #14 (Composite), #19 (RCT)', color: 'bg-success-600' },
                { label: 'Active Caries Documented', value: '#29', color: 'bg-alert-600' },
              ].map(s => (
                <div key={s.label} className="bg-clinical-50 rounded-lg p-3 border border-clinical-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full ${s.color}`} />
                    <p className="text-[10px] font-semibold text-clinical-600">{s.label}</p>
                  </div>
                  <p className="text-xs text-clinical-800">{s.value}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-clinical-400 mt-2">
              Dental Status reflects documented tooth conditions from clinical chart entries. It does not constitute an automated clinical assessment.
            </p>
          </Section>

          {/* Procedure log */}
          <Section title="Clinical Procedure Log" subtitle="Chronological chart history">
            <div className="divide-y divide-clinical-50">
              {CHART_LOG.map((entry, i) => (
                <div key={i} className="py-3 flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-[11px] font-bold text-primary-700 shrink-0 mt-0.5">
                    #{entry.tooth}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-clinical-800">{entry.procedure}</p>
                      <StatusBadge status={entry.status} />
                    </div>
                    <p className="text-xs text-clinical-500 mt-0.5">{entry.date} · {entry.dentist}</p>
                    {entry.notes && <p className="text-[11px] text-clinical-500 mt-0.5 italic">{entry.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── Imaging Tab ─────────────────────────────────── */}
      {activeTab === 'imaging' && (
        <div className="space-y-5">
          {/* Dual upload notice */}
          <div className="p-3 bg-primary-50 border border-primary-100 rounded-xl text-xs text-primary-700">
            <p className="font-semibold mb-0.5">Imaging Upload</p>
            <p className="text-primary-600">
              Authorized clinic staff may upload X-rays taken at this clinic. Patients may upload X-rays obtained from outside providers via the Patient Portal.
              All uploads are associated with this patient record and are available for dentist review.
            </p>
          </div>

          {/* Clinic upload */}
          <Section title="Upload Imaging — Clinic Staff" subtitle="For X-rays taken at Premier Dental Solutions PH">
            {uploadState === 'idle' && (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-clinical-300 rounded-xl flex items-center gap-3 hover:border-primary-400 hover:bg-primary-50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-clinical-100 group-hover:bg-primary-100 flex items-center justify-center shrink-0 transition-colors">
                  <IconUpload className="w-5 h-5 text-clinical-400 group-hover:text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-clinical-700">Upload X-Ray or Imaging File</p>
                  <p className="text-xs text-clinical-400">JPEG, PNG, DICOM · Max 20MB · Will be linked to this patient</p>
                </div>
              </button>
            )}
            {uploadState === 'validating' && (
              <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl flex items-center gap-3">
                <IconLoader className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-sm font-medium text-primary-700">Validating file...</p>
                  <p className="text-xs text-primary-500">Checking format, size, and preparing for upload</p>
                </div>
              </div>
            )}
            {uploadState === 'error' && (
              <div className="p-4 bg-alert-50 border border-alert-100 rounded-xl flex items-center gap-3">
                <IconAlert className="w-5 h-5 text-alert-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-alert-700">Upload Failed</p>
                  <p className="text-xs text-alert-600">Invalid file type. Use JPEG, PNG, or DICOM (.dcm).</p>
                </div>
                <button onClick={() => setUploadState('idle')} className="text-clinical-400 hover:text-clinical-600">
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            )}
            {uploadState === 'success' && (
              <div className="p-4 bg-success-50 border border-success-100 rounded-xl flex items-center gap-3">
                <IconCheck className="w-5 h-5 text-success-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-success-700">Upload Successful</p>
                  <p className="text-xs text-success-600 truncate">{uploadedFile} · Associated with {PATIENT.name}</p>
                </div>
                <button onClick={() => setUploadState('idle')} className="text-clinical-400 hover:text-clinical-600">
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.dcm" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          </Section>

          {/* Patient Portal Upload */}
          <Section title="Patient Portal Uploads" subtitle="Images submitted by the patient from an external provider or home device">
            <div className="p-3 bg-clinical-50 border border-clinical-100 rounded-xl text-xs text-clinical-600 mb-4">
              <p className="font-semibold text-clinical-700 mb-0.5">Patient-submitted images</p>
              <p>
                Patients may upload X-rays, photos, or scans from external providers via their secure patient portal.
                All patient-submitted files are associated with this record and held pending dentist review.
              </p>
            </div>
            {patientUploadState === 'idle' && (
              <button
                onClick={() => patientFileRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-clinical-300 rounded-xl flex items-center gap-3 hover:border-primary-400 hover:bg-primary-50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-clinical-100 group-hover:bg-primary-100 flex items-center justify-center shrink-0 transition-colors">
                  <IconUpload className="w-5 h-5 text-clinical-400 group-hover:text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-clinical-700">Simulate Patient Portal Upload</p>
                  <p className="text-xs text-clinical-400">JPEG, PNG, DICOM · Patient-submitted via secure portal</p>
                </div>
              </button>
            )}
            {patientUploadState === 'validating' && (
              <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl flex items-center gap-3">
                <IconLoader className="w-5 h-5 text-primary-600" />
                <p className="text-sm font-medium text-primary-700">Validating patient file...</p>
              </div>
            )}
            {patientUploadState === 'error' && (
              <div className="p-4 bg-alert-50 border border-alert-100 rounded-xl flex items-center gap-3">
                <IconAlert className="w-5 h-5 text-alert-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-alert-700">Upload Failed</p>
                  <p className="text-xs text-alert-600">Invalid file type. Use JPEG, PNG, or DICOM (.dcm).</p>
                </div>
                <button onClick={() => setPatientUploadState('idle')} className="text-clinical-400 hover:text-clinical-600">
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            )}
            {patientUploadState === 'success' && (
              <div className="p-4 bg-success-50 border border-success-100 rounded-xl flex items-center gap-3">
                <IconCheck className="w-5 h-5 text-success-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-success-700">Patient File Received</p>
                  <p className="text-xs text-success-600 truncate">{patientUploadedFile} · Pending dentist review · Patient: {PATIENT.name}</p>
                </div>
                <button onClick={() => setPatientUploadState('idle')} className="text-clinical-400 hover:text-clinical-600">
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            )}
            <input ref={patientFileRef} type="file" accept=".jpg,.jpeg,.png,.dcm" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePatientUpload(f); }} />
          </Section>

          {/* Imaging timeline */}
          <Section title="Chronological Imaging Timeline" subtitle={`${xrays.length} records — clinic and patient-submitted, sorted newest first`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {xrays.map((xray, i) => {
                const isPatient = xray.uploader.includes('Patient Portal');
                return (
                  <button
                    key={i}
                    onClick={() => setLightboxImg(xray.name)}
                    className={`group p-3 rounded-xl border transition-all text-left ${isPatient ? 'border-primary-100 bg-primary-50 hover:border-primary-300' : 'border-clinical-200 bg-clinical-50 hover:border-primary-300 hover:bg-primary-50'}`}
                  >
                    <div className="aspect-video bg-clinical-800 rounded-lg mb-2 flex items-center justify-center">
                      <IconImage className="w-7 h-7 text-clinical-500 group-hover:text-primary-400 transition-colors" />
                    </div>
                    <p className="text-xs font-medium text-clinical-700 truncate leading-tight">{xray.name}</p>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-mono px-1 rounded border ${isPatient ? 'text-primary-700 bg-primary-100 border-primary-200' : 'text-clinical-600 bg-clinical-100 border-clinical-200'}`}>{xray.type}</span>
                      <span className="text-[10px] text-clinical-400">{xray.date}</span>
                    </div>
                    <p className="text-[10px] text-clinical-400 mt-0.5 truncate">{xray.uploader}</p>
                    {isPatient && (
                      <span className="inline-block mt-1 text-[9px] font-semibold text-primary-600 bg-primary-50 border border-primary-100 px-1.5 py-0.5 rounded">Patient Uploaded</span>
                    )}
                  </button>
                );
              })}
            </div>
          </Section>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setLightboxImg(null)}>
          <div className="bg-clinical-900 rounded-xl p-4 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">{lightboxImg}</p>
              <button onClick={() => setLightboxImg(null)} className="text-clinical-400 hover:text-white">
                <IconX className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-[4/3] bg-clinical-800 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <IconImage className="w-16 h-16 text-clinical-500 mx-auto mb-2" />
                <p className="text-xs text-clinical-500">Web-optimized DICOM viewer</p>
                <p className="text-[10px] text-clinical-600 mt-1">Patient: {PATIENT.name} · {PATIENT.id}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shared helpers ─────────────────────────────────────── */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-clinical-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-clinical-100">
        <p className="text-sm font-semibold text-clinical-800">{title}</p>
        {subtitle && <p className="text-[11px] text-clinical-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Grid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {rows.map(r => (
        <div key={r.label}>
          <p className="text-[10px] text-clinical-400 font-semibold uppercase tracking-wide">{r.label}</p>
          <p className="text-sm text-clinical-800 mt-0.5">{r.value}</p>
        </div>
      ))}
    </div>
  );
}


function StatusBadge({ status }: { status: TreatmentStatus }) {
  const map: Record<TreatmentStatus, { label: string; cls: string }> = {
    completed: { label: 'Completed', cls: 'bg-success-50 text-success-700 border-success-100' },
    planned: { label: 'Planned', cls: 'bg-clinical-100 text-clinical-600 border-clinical-200' },
    'in-progress': { label: 'In Progress', cls: 'bg-primary-50 text-primary-700 border-primary-100' },
  };
  const { label, cls } = map[status];
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>;
}
