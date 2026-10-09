import { useState, useRef, useEffect } from 'react';
import { IconAlert, IconCheck, IconLoader, IconChevronRight } from '../icons';
import type { IntakeData, MedicalAlert } from '../../App';

interface Props {
  onBack: () => void;
  onSaved?: (data: IntakeData) => void;
  initialData?: IntakeData | null;
  isDemo?: boolean;
}

/* ── Questions ─────────────────────────────────────────── */

type QType = 'yes-no' | 'yes-no-specify' | 'text' | 'select';

export interface Question {
  id: string;
  section: 'medical' | 'dental' | 'complaint';
  text: string;
  type: QType;
  followUpLabel?: string;
  options?: string[];
  alertRule?: string;
}

export const QUESTIONS: Question[] = [
  // ── Medical History ────────────────────────────────────
  {
    id: 'q01', section: 'medical',
    text: 'Do you have any known allergies to medications (e.g., Penicillin, NSAIDs, local anesthetics)?',
    type: 'yes-no-specify',
    followUpLabel: 'List the medications and describe the reaction:',
    alertRule: 'Patient reported medication allergy',
  },
  {
    id: 'q02', section: 'medical',
    text: 'Are you currently taking any prescription or over-the-counter medications, vitamins, or supplements?',
    type: 'yes-no-specify',
    followUpLabel: 'List all current medications and dosages:',
    alertRule: 'Patient is currently taking medications',
  },
  {
    id: 'q03', section: 'medical',
    text: 'Have you been diagnosed with diabetes or a blood sugar condition?',
    type: 'yes-no-specify',
    followUpLabel: 'Specify type (e.g., Type 1, Type 2, Gestational, Pre-diabetic):',
    alertRule: 'Patient reported history of diabetes',
  },
  {
    id: 'q04', section: 'medical',
    text: 'Do you have high blood pressure (hypertension)?',
    type: 'yes-no-specify',
    followUpLabel: 'List any blood pressure medications you are taking:',
    alertRule: 'Patient reported hypertension',
  },
  {
    id: 'q05', section: 'medical',
    text: 'Do you have heart disease, a pacemaker, or any cardiac conditions?',
    type: 'yes-no-specify',
    followUpLabel: 'Please describe the condition and any treatments:',
    alertRule: 'Patient reported cardiac condition',
  },
  {
    id: 'q06', section: 'medical',
    text: 'Do you have any bleeding disorders, or are you taking blood-thinning medications (e.g., Warfarin, Aspirin, Clopidogrel)?',
    type: 'yes-no-specify',
    followUpLabel: 'Please specify:',
    alertRule: 'Patient reported bleeding disorder or anticoagulant use',
  },
  {
    id: 'q07', section: 'medical',
    text: 'Are you currently pregnant or nursing?',
    type: 'yes-no',
    alertRule: 'Patient reported current pregnancy or is nursing',
  },
  {
    id: 'q08', section: 'medical',
    text: 'Do you have asthma, COPD, or any other respiratory or lung conditions?',
    type: 'yes-no-specify',
    followUpLabel: 'Please specify condition and current medications:',
    alertRule: 'Patient reported respiratory condition',
  },
  {
    id: 'q09', section: 'medical',
    text: 'Have you ever experienced an adverse reaction to local anesthesia (e.g., Lidocaine, Articaine)?',
    type: 'yes-no-specify',
    followUpLabel: 'Please describe the type of reaction and when it occurred:',
    alertRule: 'Patient reported adverse reaction to local anesthesia',
  },
  {
    id: 'q10', section: 'medical',
    text: 'Do you smoke, use tobacco products, or vape?',
    type: 'yes-no-specify',
    followUpLabel: 'Type and approximate frequency:',
  },
  {
    id: 'q11', section: 'medical',
    text: 'Have you been hospitalized or undergone surgery in the past 12 months?',
    type: 'yes-no-specify',
    followUpLabel: 'Please describe the reason and approximate date:',
    alertRule: 'Patient reported recent hospitalization or surgery',
  },
  // ── Dental History ─────────────────────────────────────
  {
    id: 'q12', section: 'dental',
    text: 'When was your last dental visit?',
    type: 'select',
    options: ['Less than 6 months ago', '6–12 months ago', '1–2 years ago', 'More than 2 years ago', 'Never'],
  },
  {
    id: 'q13', section: 'dental',
    text: 'Have you had dental X-rays taken in the past year?',
    type: 'yes-no',
  },
  {
    id: 'q14', section: 'dental',
    text: 'Do you experience dental anxiety or fear of dental procedures?',
    type: 'yes-no',
  },
  {
    id: 'q15', section: 'dental',
    text: 'Do you currently experience any tooth pain, sensitivity, or oral discomfort?',
    type: 'yes-no-specify',
    followUpLabel: 'Describe the location, type, and duration of discomfort:',
  },
  // ── Chief Complaint ────────────────────────────────────
  {
    id: 'q16', section: 'complaint',
    text: 'What is the primary reason for your visit today?',
    type: 'text',
  },
  {
    id: 'q17', section: 'complaint',
    text: 'Is there anything else you would like your dentist to know before your appointment?',
    type: 'text',
  },
];

export const DEMO_ANSWERS: Record<string, { answer: string; detail?: string }> = {
  q01: { answer: 'yes', detail: 'Penicillin (anaphylactic reaction), Sulfa drugs' },
  q02: { answer: 'yes', detail: 'Amlodipine 5mg (daily), Metformin 500mg (daily)' },
  q03: { answer: 'yes', detail: 'Type 2 Diabetes' },
  q04: { answer: 'yes', detail: 'On Amlodipine 5mg' },
  q05: { answer: 'no' },
  q06: { answer: 'no' },
  q07: { answer: 'no' },
  q08: { answer: 'no' },
  q09: { answer: 'no' },
  q10: { answer: 'no' },
  q11: { answer: 'no' },
  q12: { answer: 'Less than 6 months ago' },
  q13: { answer: 'yes' },
  q14: { answer: 'no' },
  q15: { answer: 'yes', detail: 'Occasional sensitivity in upper right area (teeth #3-5) when consuming cold beverages' },
  q16: { answer: 'Routine cleaning and follow-up on crown at tooth #3' },
  q17: { answer: '' },
};

export const SECTIONS = [
  { id: 'medical', label: 'Medical History', count: 11 },
  { id: 'dental', label: 'Dental History', count: 4 },
  { id: 'complaint', label: 'Chief Complaint', count: 2 },
] as const;

/* ── Shared helpers ─────────────────────────────────────── */

export function generateAlerts(answers: Record<string, { answer: string; detail?: string }>): MedicalAlert[] {
  return QUESTIONS
    .filter(q => q.alertRule && answers[q.id]?.answer === 'yes')
    .map(q => ({
      questionId: q.id,
      rule: q.alertRule!,
      detail: answers[q.id]?.detail || undefined,
      question: q.text,
    }));
}

export const DEMO_INTAKE_DATA: IntakeData = {
  answers: DEMO_ANSWERS,
  alerts: generateAlerts(DEMO_ANSWERS),
  submittedAt: '2026-09-10T09:00:00.000Z',
};

/* ── Component ─────────────────────────────────────────── */

export default function IntakeForm({ onBack, onSaved, initialData, isDemo = false }: Props) {
  const [answers, setAnswers] = useState<Record<string, { answer: string; detail?: string }>>(
    () => initialData?.answers ?? (isDemo ? DEMO_ANSWERS : {})
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<'medical' | 'dental' | 'complaint'>('medical');
  const [signatureData, setSignatureData] = useState<string | null>(initialData ? 'pre-signed' : null);

  const setAnswer = (id: string, answer: string) =>
    setAnswers(p => ({ ...p, [id]: { ...p[id], answer } }));

  const setDetail = (id: string, detail: string) =>
    setAnswers(p => ({ ...p, [id]: { ...p[id], detail } }));

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      const alerts = generateAlerts(answers);
      const data: IntakeData = {
        answers,
        alerts,
        submittedAt: new Date().toISOString(),
      };
      setSaving(false);
      setSaved(true);
      onSaved?.(data);
    }, 900);
  };

  const sectionQs = (s: string) => QUESTIONS.filter(q => q.section === s);
  const sectionAnswered = (s: string) =>
    sectionQs(s).filter(q => !!answers[q.id]?.answer).length;

  const alertsGenerated = QUESTIONS.filter(q =>
    q.alertRule && answers[q.id]?.answer === 'yes'
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-clinical-100 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-clinical-500 hover:text-clinical-800 font-medium mb-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <h2 className="text-base font-semibold text-clinical-900 font-display">Medical Intake Form</h2>
        <p className="text-xs text-clinical-500 mt-0.5">
          Your responses inform your dentist for safe, personalized care.
        </p>
      </div>

      {/* Section tabs */}
      <div className="px-4 pt-3 shrink-0">
        <div className="flex gap-1 bg-clinical-100 rounded-xl p-1">
          {SECTIONS.map(s => {
            const answered = sectionAnswered(s.id);
            const total = sectionQs(s.id).length;
            const done = answered === total;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                  activeSection === s.id
                    ? 'bg-white text-clinical-900 shadow-sm'
                    : 'text-clinical-500 hover:text-clinical-700'
                }`}
              >
                <span>{s.label}</span>
                <span className={`text-[9px] font-medium ${done ? 'text-success-600' : 'text-clinical-400'}`}>
                  {answered}/{total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Generated alerts preview */}
        {activeSection === 'medical' && alertsGenerated.length > 0 && (
          <div className="p-3 bg-alert-50 border border-alert-100 rounded-xl">
            <div className="flex items-center gap-1.5 mb-2">
              <IconAlert className="w-3.5 h-3.5 text-alert-600 shrink-0" />
              <p className="text-[11px] font-semibold text-alert-700">
                {alertsGenerated.length} Medical Alert{alertsGenerated.length > 1 ? 's' : ''} will be generated
              </p>
            </div>
            <p className="text-[10px] text-alert-600 leading-relaxed">
              Based on your responses, your dentist will be notified of relevant medical information before your appointment.
              These are informational flags, not diagnoses.
            </p>
          </div>
        )}

        {sectionQs(activeSection).map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            answer={answers[q.id]?.answer ?? ''}
            detail={answers[q.id]?.detail ?? ''}
            flagged={!!(q.alertRule && answers[q.id]?.answer === 'yes')}
            onAnswer={val => setAnswer(q.id, val)}
            onDetail={val => setDetail(q.id, val)}
          />
        ))}

        {/* Digital Signature — shown on Chief Complaint section */}
        {activeSection === 'complaint' && !saved && (
          <SignaturePad
            onSigned={(data) => setSignatureData(data)}
            hasSig={!!signatureData}
          />
        )}

        {saved && (
          <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-100 rounded-xl text-xs text-success-700 font-medium">
            <IconCheck className="w-4 h-4 shrink-0" />
            Responses saved and signed. Your dentist will be notified of any flagged items before your appointment.
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="px-4 py-4 border-t border-clinical-100 bg-white shrink-0 flex gap-2">
        {activeSection !== 'complaint' ? (
          <button
            onClick={() => {
              const order = ['medical', 'dental', 'complaint'] as const;
              const idx = order.indexOf(activeSection);
              setActiveSection(order[idx + 1]);
            }}
            className="flex-1 py-3 bg-primary-700 text-white font-semibold text-sm rounded-xl hover:bg-primary-800 transition-colors flex items-center justify-center gap-2"
          >
            Next Section <IconChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving || !signatureData}
            className="flex-1 py-3 bg-success-600 text-white font-semibold text-sm rounded-xl hover:bg-success-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <><IconLoader className="w-4 h-4" /> Saving...</> : <><IconCheck className="w-4 h-4" /> Sign & Submit</>}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Digital Signature Pad ─────────────────────────────── */

function SignaturePad({ onSigned, hasSig }: { onSigned: (data: string) => void; hasSig: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [cleared, setCleared] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext('2d')!;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.preventDefault();
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  };

  const stop = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSigned(canvas.toDataURL());
    setCleared(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCleared(true);
    onSigned('');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div className="rounded-xl border border-clinical-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-clinical-800">Digital Signature</p>
          <p className="text-[10px] text-clinical-500">
            By signing, you confirm that your responses are accurate and authorize the clinic to use this information for your dental care.
          </p>
        </div>
        {hasSig && !cleared && (
          <button
            type="button"
            onClick={clear}
            className="text-[10px] text-clinical-400 hover:text-clinical-700 font-medium ml-3 shrink-0"
          >
            Clear
          </button>
        )}
      </div>
      <div className={`relative rounded-lg overflow-hidden border ${hasSig && !cleared ? 'border-success-300 bg-success-50' : 'border-clinical-300 bg-clinical-50'}`}>
        <canvas
          ref={canvasRef}
          width={320}
          height={96}
          className="w-full touch-none cursor-crosshair"
          style={{ height: '96px' }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={stop}
        />
        {!hasSig && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-[11px] text-clinical-400">Draw your signature here</p>
          </div>
        )}
        {hasSig && !cleared && (
          <div className="absolute bottom-1 right-2 pointer-events-none">
            <p className="text-[9px] text-success-600 font-medium">✓ Signed</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Single question card ──────────────────────────────── */

function QuestionCard({
  question, answer, detail, flagged, onAnswer, onDetail
}: {
  question: Question;
  answer: string;
  detail: string;
  flagged: boolean;
  onAnswer: (v: string) => void;
  onDetail: (v: string) => void;
}) {
  return (
    <div className={`rounded-xl border p-3.5 transition-colors ${
      flagged ? 'border-alert-200 bg-alert-50/40' : 'border-clinical-200 bg-white'
    }`}>
      <div className="flex items-start gap-2 mb-2.5">
        {flagged && <IconAlert className="w-3.5 h-3.5 text-alert-500 mt-0.5 shrink-0" />}
        <p className="text-xs font-medium text-clinical-800 leading-relaxed flex-1">{question.text}</p>
      </div>

      {question.type === 'yes-no' || question.type === 'yes-no-specify' ? (
        <div className="flex gap-2 mb-2">
          {(['yes', 'no'] as const).map(v => (
            <button
              key={v}
              onClick={() => onAnswer(v)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all capitalize ${
                answer === v
                  ? v === 'yes'
                    ? 'bg-alert-50 border-alert-300 text-alert-700'
                    : 'bg-success-50 border-success-300 text-success-700'
                  : 'bg-white border-clinical-200 text-clinical-600 hover:border-clinical-400'
              }`}
            >
              {v === 'yes' ? '✓ Yes' : '✕ No'}
            </button>
          ))}
        </div>
      ) : question.type === 'select' ? (
        <select
          value={answer}
          onChange={e => onAnswer(e.target.value)}
          className="w-full text-xs border border-clinical-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
        >
          <option value="">— Select —</option>
          {question.options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <textarea
          value={answer}
          onChange={e => onAnswer(e.target.value)}
          rows={2}
          placeholder="Type your answer here..."
          className="w-full text-xs border border-clinical-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none placeholder:text-clinical-300 mb-2"
        />
      )}

      {question.type === 'yes-no-specify' && answer === 'yes' && (
        <div className="mt-1">
          <p className="text-[10px] font-semibold text-clinical-600 mb-1">{question.followUpLabel}</p>
          <textarea
            value={detail}
            onChange={e => onDetail(e.target.value)}
            rows={2}
            placeholder="Please provide details..."
            className={`w-full text-xs border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none placeholder:text-clinical-300 ${
              flagged ? 'border-alert-200' : 'border-clinical-200'
            }`}
          />
        </div>
      )}
    </div>
  );
}
