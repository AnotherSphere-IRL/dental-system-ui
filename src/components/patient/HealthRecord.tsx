import { useState, useRef } from 'react';
import {
  IconUpload, IconCheck, IconX, IconAlert, IconImage,
  IconFileText, IconClock, IconLoader
} from '../icons';
import PatientDentalChart from './PatientDentalChart';
import { QUESTIONS, SECTIONS } from './IntakeForm';
import type { IntakeData } from '../../App';

type UploadState = 'idle' | 'validating' | 'error' | 'success';
type AccessRequest = {
  id: string;
  dentist: string;
  clinic: string;
  requestedAt: string;
  status: 'pending' | 'granted' | 'denied';
};

const DEMO_REQUESTS: AccessRequest[] = [
  {
    id: 'req-1',
    dentist: 'Dr. Ricardo Santos',
    clinic: 'Smile Care Dental Clinic, BGC',
    requestedAt: 'Sep 23, 2026 · 2:14 PM',
    status: 'pending',
  },
  {
    id: 'req-2',
    dentist: 'Dr. Luisa Ferrer',
    clinic: 'BrightSmile Dental, Makati',
    requestedAt: 'Sep 20, 2026 · 10:02 AM',
    status: 'granted',
  },
];

const DEMO_XRAYS = [
  { name: 'Panoramic X-Ray (OPG)', date: 'Sep 10, 2026', type: 'OPG', from: 'Clinic Upload' },
  { name: 'Periapical #19', date: 'Jul 15, 2026', type: 'PA', from: 'Clinic Upload' },
];

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.dcm'];

interface Props {
  isDemo: boolean;
  intakeData: IntakeData | null;
  onOpenIntake?: () => void;
}

export default function HealthRecord({ isDemo, intakeData, onOpenIntake }: Props) {
  const intakeCompleted = intakeData !== null;
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState('');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>(isDemo ? DEMO_REQUESTS : []);
  const [activeTab, setActiveTab] = useState<'chart' | 'xrays' | 'intake' | 'access'>('chart');
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = file.type.startsWith('image/') || ALLOWED_EXT.includes(ext);
    const isValidSize = file.size <= 20 * 1024 * 1024; // 20MB

    setUploadState('validating');
    setTimeout(() => {
      if (!isValidType) {
        setUploadState('error');
        setUploadError('Invalid file type. Please upload JPEG, PNG, or DICOM (.dcm) format.');
        return;
      }
      if (!isValidSize) {
        setUploadState('error');
        setUploadError('File exceeds 20MB limit. Please compress or use a different file.');
        return;
      }
      setUploadState('success');
      setUploadedFile(file.name);
    }, 1400);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateFile(file);
  };

  const handleAccessDecision = (reqId: string, decision: 'granted' | 'denied') => {
    setRequests(prev =>
      prev.map(r => r.id === reqId ? { ...r, status: decision } : r)
    );
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-clinical-900 font-display">My Health Record</h2>
          <p className="text-xs text-clinical-500 mt-0.5">Manage your medical info, imaging, and access</p>
        </div>
        {pendingRequests.length > 0 && (
          <span className="flex items-center gap-1 px-2 py-1 bg-alert-50 border border-alert-100 text-alert-700 text-[10px] font-bold rounded-lg">
            <IconAlert className="w-3 h-3" /> {pendingRequests.length} Request
          </span>
        )}
      </div>

      {/* Access request alert */}
      {pendingRequests.length > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-warning-700 flex items-center gap-1.5">
            <IconAlert className="w-3.5 h-3.5" />
            {pendingRequests.length} pending access request{pendingRequests.length > 1 ? 's' : ''}
          </p>
          <p className="text-[10px] text-warning-600 mt-0.5">
            A dentist has requested access to your records. See the Access tab below.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 bg-clinical-100 rounded-xl p-1">
        {([
          { id: 'chart', label: 'Dental Chart' },
          { id: 'xrays', label: 'X-Rays' },
          { id: 'intake', label: 'Intake' },
          { id: 'access', label: `Access${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}` },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-[11px] font-semibold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white text-clinical-900 shadow-sm'
                : 'text-clinical-500 hover:text-clinical-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dental Chart tab */}
      {activeTab === 'chart' && <PatientDentalChart isDemo={isDemo} />}

      {/* X-Rays tab */}
      {activeTab === 'xrays' && (
        <div className="space-y-4">
          {/* Upload zone */}
          <div>
            <p className="text-xs font-semibold text-clinical-700 mb-2">Upload External X-Ray</p>
            {uploadState === 'idle' && (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-clinical-300 bg-clinical-50 hover:border-primary-400 hover:bg-primary-50/50'
                }`}
              >
                <IconUpload className="w-8 h-8 text-clinical-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-clinical-700">Drop X-Ray file here</p>
                <p className="text-[11px] text-clinical-400 mt-1">JPEG, PNG, DICOM · Max 20MB</p>
                <button className="mt-3 px-3 py-1.5 bg-primary-700 text-white text-xs font-semibold rounded-lg hover:bg-primary-800 transition-colors">
                  Choose File
                </button>
              </div>
            )}

            {uploadState === 'validating' && (
              <div className="border border-primary-200 rounded-xl p-5 bg-primary-50 flex flex-col items-center">
                <IconLoader className="w-8 h-8 text-primary-600 mb-2" />
                <p className="text-sm font-medium text-primary-700">Validating file...</p>
                <p className="text-[11px] text-primary-500 mt-1">Checking format, size, and metadata</p>
              </div>
            )}

            {uploadState === 'error' && (
              <div className="border border-alert-200 rounded-xl p-4 bg-alert-50">
                <div className="flex items-start gap-2">
                  <IconAlert className="w-5 h-5 text-alert-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-alert-700">Upload Failed</p>
                    <p className="text-xs text-alert-600 mt-0.5">{uploadError}</p>
                    <button
                      onClick={() => { setUploadState('idle'); setUploadError(''); if (fileRef.current) fileRef.current.value = ''; }}
                      className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-800"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {uploadState === 'success' && (
              <div className="border border-success-200 rounded-xl p-4 bg-success-50">
                <div className="flex items-start gap-2">
                  <IconCheck className="w-5 h-5 text-success-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-success-700">Upload Successful</p>
                    <p className="text-xs text-success-600 mt-0.5 truncate">{uploadedFile}</p>
                    <p className="text-[10px] text-success-500 mt-1">
                      Auto-linked to upcoming appointment (Sep 24, 2026). Dentist notified.
                    </p>
                  </div>
                  <button
                    onClick={() => { setUploadState('idle'); setUploadedFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="text-success-400 hover:text-success-600"
                  >
                    <IconX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.dcm" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Test invalid file button for demo */}
          {isDemo && (
            <button
              onClick={() => {
                setUploadState('validating');
                setTimeout(() => {
                  setUploadState('error');
                  setUploadError('Invalid file type. Please upload JPEG, PNG, or DICOM (.dcm) format. File ".pdf" is not supported.');
                }, 1200);
              }}
              className="text-[10px] text-clinical-400 underline"
            >
              Demo: test invalid file upload
            </button>
          )}

          {/* X-ray history */}
          {isDemo ? (
            <div className="bg-white border border-clinical-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-clinical-100">
                <p className="text-xs font-semibold text-clinical-700">Imaging Timeline</p>
              </div>
              <div className="divide-y divide-clinical-50">
                {[...DEMO_XRAYS, ...(uploadState === 'success' && uploadedFile ? [{
                  name: uploadedFile,
                  date: 'Today',
                  type: 'EXT',
                  from: 'Patient Upload'
                }] : [])].map((xray, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 bg-clinical-800 rounded-lg flex items-center justify-center shrink-0">
                      <IconImage className="w-5 h-5 text-clinical-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-clinical-800 truncate">{xray.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <IconClock className="w-3 h-3 text-clinical-400" />
                        <span className="text-[10px] text-clinical-400">{xray.date}</span>
                        <span className="text-[10px] font-mono text-primary-600 bg-primary-50 px-1 rounded">{xray.type}</span>
                        <span className="text-[10px] text-clinical-400">· {xray.from}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : uploadState === 'success' && uploadedFile ? (
            <div className="bg-white border border-clinical-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-clinical-100">
                <p className="text-xs font-semibold text-clinical-700">Imaging Timeline</p>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 bg-clinical-800 rounded-lg flex items-center justify-center shrink-0">
                  <IconImage className="w-5 h-5 text-clinical-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-clinical-800 truncate">{uploadedFile}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <IconClock className="w-3 h-3 text-clinical-400" />
                    <span className="text-[10px] text-clinical-400">Today</span>
                    <span className="text-[10px] font-mono text-primary-600 bg-primary-50 px-1 rounded">EXT</span>
                    <span className="text-[10px] text-clinical-400">· Patient Upload</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-clinical-50 border border-dashed border-clinical-200 rounded-xl p-8 text-center">
              <IconImage className="w-10 h-10 text-clinical-200 mx-auto mb-2" />
              <p className="text-xs font-medium text-clinical-500">No X-rays on file yet</p>
              <p className="text-[10px] text-clinical-400 mt-1 leading-relaxed">
                Your dental images will appear here once uploaded by your clinic or by you above.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Intake form tab */}
      {activeTab === 'intake' && (
        <div className="space-y-3">
          <p className="text-xs text-clinical-500">
            Your medical intake form is shared with your assigned dentist before each appointment.
          </p>

          {intakeCompleted ? (
            <>
              {/* Submission confirmation */}
              <div className="flex items-center gap-3 p-3 bg-success-50 border border-success-100 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-success-100 flex items-center justify-center shrink-0">
                  <IconCheck className="w-4 h-4 text-success-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-success-700">Intake Form Submitted</p>
                  <p className="text-[10px] text-success-600">
                    {new Date(intakeData!.submittedAt).toLocaleString('en-PH', {
                      month: 'long', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                {intakeData!.alerts.length > 0 && (
                  <span className="text-[10px] font-bold text-alert-700 bg-alert-50 border border-alert-100 px-2 py-0.5 rounded-lg shrink-0">
                    {intakeData!.alerts.length} alert{intakeData!.alerts.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Section completion — computed from actual answers */}
              {SECTIONS.map(s => {
                const qs = QUESTIONS.filter(q => q.section === s.id);
                const answered = qs.filter(q => !!intakeData!.answers[q.id]?.answer).length;
                const complete = answered === qs.length;
                return (
                  <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                    complete ? 'border-success-100 bg-success-50' : 'border-warning-100 bg-warning-50'
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      complete ? 'bg-success-600' : 'bg-warning-500'
                    }`}>
                      {complete
                        ? <IconCheck className="w-3.5 h-3.5 text-white" />
                        : <span className="text-white text-[10px] font-bold">!</span>}
                    </div>
                    <p className="flex-1 text-xs font-medium text-clinical-800">{s.label}</p>
                    <span className={`text-[10px] font-medium ${complete ? 'text-success-600' : 'text-warning-600'}`}>
                      {answered}/{qs.length}
                    </span>
                  </div>
                );
              })}

              {/* Medical alerts summary */}
              {intakeData!.alerts.length > 0 && (
                <div className="p-3 bg-alert-50 border border-alert-100 rounded-xl space-y-1.5">
                  <p className="text-[11px] font-semibold text-alert-700 flex items-center gap-1.5">
                    <IconAlert className="w-3.5 h-3.5" />
                    {intakeData!.alerts.length} Medical Alert{intakeData!.alerts.length !== 1 ? 's' : ''} Generated
                  </p>
                  {intakeData!.alerts.map(a => (
                    <p key={a.questionId} className="text-[10px] text-alert-600 pl-5 leading-relaxed">
                      · {a.rule}{a.detail ? ` — ${a.detail}` : ''}
                    </p>
                  ))}
                </div>
              )}

              <button
                onClick={onOpenIntake}
                className="w-full py-3 bg-primary-700 text-white text-sm font-semibold rounded-xl hover:bg-primary-800 transition-colors flex items-center justify-center gap-2"
              >
                <IconFileText className="w-4 h-4" />
                View / Update Intake Form
              </button>
            </>
          ) : (
            <>
              {/* Not-started state */}
              <div className="bg-warning-50 border border-warning-200 rounded-xl p-5 text-center">
                <div className="w-12 h-12 rounded-full bg-warning-100 flex items-center justify-center mx-auto mb-3">
                  <IconFileText className="w-6 h-6 text-warning-500" />
                </div>
                <p className="text-sm font-semibold text-warning-700">Intake Form Not Started</p>
                <p className="text-xs text-warning-600 mt-1.5 leading-relaxed">
                  You must complete your patient intake before booking your first appointment.
                  This form collects your medical and dental history to ensure safe, personalized care.
                </p>
              </div>
              {SECTIONS.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-clinical-100 bg-clinical-50">
                  <div className="w-6 h-6 rounded-full bg-clinical-300 flex items-center justify-center shrink-0">
                    <span className="text-white text-[10px] font-bold">{i + 1}</span>
                  </div>
                  <p className="flex-1 text-xs font-medium text-clinical-600">{s.label}</p>
                  <span className="text-[10px] font-medium text-clinical-400">Not started</span>
                </div>
              ))}
              <button
                onClick={onOpenIntake}
                className="w-full py-3 bg-warning-600 text-white text-sm font-semibold rounded-xl hover:bg-warning-700 transition-colors flex items-center justify-center gap-2"
              >
                <IconFileText className="w-4 h-4" />
                Start Patient Intake
              </button>
            </>
          )}
        </div>
      )}

      {/* Access requests tab */}
      {activeTab === 'access' && (
        <div className="space-y-3">
          <p className="text-xs text-clinical-500">
            Review requests from dentists seeking access to your medical records. You control who sees your data.
          </p>
          {requests.map(req => (
            <div key={req.id} className={`bg-white rounded-xl border overflow-hidden ${
              req.status === 'pending' ? 'border-warning-200' :
              req.status === 'granted' ? 'border-success-100' : 'border-clinical-200'
            }`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0 text-sm font-bold text-primary-700">
                    {req.dentist.split(' ').map(w => w[0]).slice(1, 3).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-clinical-900">{req.dentist}</p>
                    <p className="text-[11px] text-clinical-500">{req.clinic}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-clinical-400">
                      <IconClock className="w-3 h-3" />
                      <span>{req.requestedAt}</span>
                    </div>
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="mt-3">
                    <p className="text-xs text-clinical-700 mb-2">
                      This dentist is requesting read access to your dental records, intake history, and X-rays.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccessDecision(req.id, 'granted')}
                        className="flex-1 py-2.5 bg-success-600 text-white text-xs font-bold rounded-lg hover:bg-success-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <IconCheck className="w-3.5 h-3.5" /> Grant Access
                      </button>
                      <button
                        onClick={() => handleAccessDecision(req.id, 'denied')}
                        className="flex-1 py-2.5 bg-white text-alert-600 text-xs font-bold rounded-lg border border-alert-200 hover:bg-alert-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <IconX className="w-3.5 h-3.5" /> Deny
                      </button>
                    </div>
                  </div>
                )}

                {req.status === 'granted' && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-success-600 font-medium">
                    <IconCheck className="w-3.5 h-3.5" /> Access Granted · Logged in audit trail
                  </div>
                )}

                {req.status === 'denied' && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-clinical-500 font-medium">
                    <IconX className="w-3.5 h-3.5 text-alert-500" /> Access Denied
                  </div>
                )}
              </div>
            </div>
          ))}

          {requests.filter(r => r.status === 'pending').length === 0 && (
            <div className="text-center py-8">
              <IconFileText className="w-10 h-10 text-clinical-200 mx-auto mb-2" />
              <p className="text-xs text-clinical-400">No pending access requests</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
