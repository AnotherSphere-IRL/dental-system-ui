export type ToothCondition = 'normal' | 'caries' | 'restored' | 'missing' | 'crown' | 'rct' | 'implant';

interface Props {
  conditions: Record<number, ToothCondition>;
  selected?: number | null;
  onToothClick?: (n: number) => void;
  compact?: boolean;
}

// ── Arch math ────────────────────────────────────────────────
// Upper: ellipse center (310, -70), rx=310, ry=300
// Lower: ellipse center (310,  650), rx=310, ry=300
// Teeth travel 8° apart on each arch.

const DEG = Math.PI / 180;

function getPos(n: number) {
  let cx: number, cy: number, rx: number, ry: number, theta: number;
  if (n <= 16) {
    cx = 310; cy = -70; rx = 310; ry = 300;
    theta = (150 - (n - 1) * 8) * DEG;
  } else {
    cx = 310; cy = 650; rx = 310; ry = 300;
    theta = (210 + (32 - n) * 8) * DEG;
  }
  const x = cx + rx * Math.cos(theta);
  const y = cy + ry * Math.sin(theta);
  const dx = rx * Math.cos(theta);
  const dy = ry * Math.sin(theta);
  // rotation: align local +y axis (crown direction) with outward normal from arch center
  const rot = Math.atan2(-dx, dy) / DEG;
  return { x, y, rot };
}

function getType(n: number): 'molar' | 'premolar' | 'canine' | 'incisor' {
  if ([1,2,3,14,15,16,17,18,19,30,31,32].includes(n)) return 'molar';
  if ([4,5,12,13,20,21,28,29].includes(n)) return 'premolar';
  if ([6,11,22,27].includes(n)) return 'canine';
  return 'incisor';
}

// ── Tooth SVG paths (local coords: y>0 = crown, y<0 = root) ──

const CROWN: Record<ReturnType<typeof getType>, string> = {
  // Narrow, rounded incisal edge
  incisor: 'M -5.5,0 L -5.5,11 Q -5.5,16 0,16 Q 5.5,16 5.5,11 L 5.5,0 Z',
  // Pointed cuspid tip
  canine:  'M -6.5,0 L -8,11 L 0,21 L 8,11 L 6.5,0 Z',
  // Two-cusp bicuspid
  premolar:'M -8.5,0 L -9.5,11 Q -7,15.5 -3,14.5 L -3,11.5 L 0,13.5 L 3,11.5 L 3,14.5 Q 7,15.5 9.5,11 L 8.5,0 Z',
  // Wide four-cusp molar
  molar:   'M -12,0 L -13,10 Q -10,15.5 -5,14.5 L -5,11.5 L -2.5,13 L 0,12 L 2.5,13 L 5,11.5 L 5,14.5 Q 10,15.5 13,10 L 12,0 Z',
};

const ROOT: Record<ReturnType<typeof getType>, string> = {
  incisor: 'M -5.5,0 Q -5,-4 -3,-12 Q 0,-14.5 3,-12 Q 5,-4 5.5,0 Z',
  canine:  'M -6.5,0 Q -6,-6 -4,-15 Q 0,-18.5 4,-15 Q 6,-6 6.5,0 Z',
  premolar:'M -8.5,0 Q -8,-5 -5.5,-13.5 Q 0,-16 5.5,-13.5 Q 8,-5 8.5,0 Z',
  // Bifurcated molar root
  molar:   'M -12,0 Q -12,-4 -10,-9 Q -6,-13 -3,-12 L -3,-5 L 3,-5 L 3,-12 Q 6,-13 10,-9 Q 12,-4 12,0 Z',
};

// Hit-area ellipse rx per type
const SEL_RX: Record<ReturnType<typeof getType>, number> = {
  molar: 16, premolar: 12, canine: 10, incisor: 8,
};

// ── Status visual styles ──────────────────────────────────────

interface S { fill: string; stroke: string; sw: number; opacity: number; dash?: string }

const STATUS: Record<ToothCondition, S> = {
  normal:   { fill: '#f8fafc', stroke: '#94a3b8', sw: 1.5, opacity: 1 },
  caries:   { fill: '#fef3c7', stroke: '#d97706', sw: 2,   opacity: 1 },
  restored: { fill: '#dcfce7', stroke: '#16a34a', sw: 2,   opacity: 1 },
  crown:    { fill: '#cffafe', stroke: '#0e7490', sw: 2,   opacity: 1 },
  rct:      { fill: '#fff7ed', stroke: '#b45309', sw: 2,   opacity: 1 },
  implant:  { fill: '#e0f2fe', stroke: '#0369a1', sw: 2,   opacity: 1 },
  missing:  { fill: 'none',   stroke: '#cbd5e1', sw: 1,   opacity: 0.45, dash: '3,2' },
};

// ── Component ─────────────────────────────────────────────────

export default function DentalArchSVG({ conditions, selected, onToothClick, compact = false }: Props) {
  const numFontSize = compact ? 7 : 8.5;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox="0 0 620 535"
        width="100%"
        style={{ minWidth: compact ? '300px' : '400px', maxWidth: '620px', display: 'block', margin: '0 auto' }}
        aria-label="Dental arch chart — Universal Tooth Numbering System 1–32"
      >
        {/* ── Gum/jaw band backgrounds ───────────────── */}
        {/* Upper jaw band (soft gray band along the arch) */}
        <path
          d="M 41.5,80 A 310,300 0 0,1 578.5,80"
          fill="none" stroke="#f1f5f9" strokeWidth="34" strokeLinecap="round"
        />
        {/* Lower jaw band */}
        <path
          d="M 41.5,500 A 310,300 0 0,0 578.5,500"
          fill="none" stroke="#f1f5f9" strokeWidth="34" strokeLinecap="round"
        />

        {/* ── Arch centerline guides (dashed) ─────────── */}
        <path
          d="M 41.5,80 A 310,300 0 0,1 578.5,80"
          fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4"
        />
        <path
          d="M 41.5,500 A 310,300 0 0,0 578.5,500"
          fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4"
        />

        {/* ── Jaw labels ───────────────────────────────── */}
        <text x="310" y="13"  textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="700" letterSpacing="3" fontFamily="Inter, system-ui, sans-serif">MAXILLA — UPPER JAW</text>
        <text x="310" y="527" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="700" letterSpacing="3" fontFamily="Inter, system-ui, sans-serif">MANDIBLE — LOWER JAW</text>

        {/* ── Midline indicator ─────────────────────────── */}
        <line x1="310" y1="272" x2="310" y2="298" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,3" />
        <text x="310" y="288" textAnchor="middle" dominantBaseline="middle" fontSize="6.5" fill="#d1d9e0" fontFamily="Inter, system-ui, sans-serif" letterSpacing="2">MIDLINE</text>

        {/* ── Teeth ─────────────────────────────────────── */}
        {Array.from({ length: 32 }, (_, i) => i + 1).map(n => {
          const { x, y, rot } = getPos(n);
          const type = getType(n);
          const cond = conditions[n] ?? 'normal';
          const s = STATUS[cond];
          const isSel = selected === n;

          // Number label: offset in root direction (outward from arch)
          const rotRad = rot * DEG;
          const lDist = 33;
          const lx = x + lDist * Math.sin(rotRad);
          const ly = y - lDist * Math.cos(rotRad);

          return (
            <g key={n}>
              {/* Tooth transform group */}
              <g
                transform={`translate(${x},${y}) rotate(${rot})`}
                onClick={() => onToothClick?.(n)}
                role={onToothClick ? 'button' : undefined}
                aria-label={`Tooth ${n}${cond !== 'normal' ? ` — ${cond}` : ''}`}
                style={{ cursor: onToothClick ? 'pointer' : 'default' }}
              >
                {/* Selection ring */}
                {isSel && (
                  <ellipse
                    rx={SEL_RX[type]}
                    ry={22}
                    fill="rgba(14,116,144,0.09)"
                    stroke="#0e7490"
                    strokeWidth="1.5"
                  />
                )}

                {/* Root — not shown for missing */}
                {cond !== 'missing' && (
                  <path
                    d={ROOT[type]}
                    fill="#dde3ea"
                    stroke="#94a3b8"
                    strokeWidth="0.8"
                    strokeLinejoin="round"
                  />
                )}

                {/* Crown */}
                <path
                  d={CROWN[type]}
                  fill={s.fill}
                  stroke={s.stroke}
                  strokeWidth={s.sw}
                  strokeLinejoin="round"
                  opacity={s.opacity}
                  strokeDasharray={s.dash ?? 'none'}
                />

                {/* Crown prosthetic band marker */}
                {cond === 'crown' && (
                  <rect
                    x={type === 'molar' ? -12 : type === 'premolar' ? -9 : -6}
                    y={0.5}
                    width={type === 'molar' ? 24 : type === 'premolar' ? 18 : 12}
                    height={2.5}
                    fill="#0e7490"
                    opacity={0.35}
                  />
                )}

                {/* RCT: small canal indicator dot */}
                {cond === 'rct' && (
                  <circle cx="0" cy="7" r="2.5" fill="#b45309" opacity={0.7} />
                )}
              </g>

              {/* Tooth number label — always horizontal */}
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={numFontSize}
                fill={isSel ? '#0e7490' : '#64748b'}
                fontWeight={isSel ? '700' : '500'}
                fontFamily="'JetBrains Mono', monospace"
                opacity={s.opacity}
                style={{ cursor: onToothClick ? 'pointer' : 'default' }}
                onClick={() => onToothClick?.(n)}
              >
                {n}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
