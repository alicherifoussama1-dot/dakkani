// ============================================================
// Confirmili — Order Status Definitions (Octomatic-faithful)
// Single source of truth for status colors + Arabic labels.
// All badges use SOLID background + WHITE text (per Octomatic).
// ============================================================

export type ConfirmiliStatus =
  | 'pending'
  | 'failed_01' | 'failed_02' | 'failed_03'
  | 'confirmed'
  | 'cancelled'
  | 'postponed'
  | 'duplicate'

export interface StatusDef {
  key:      string
  label:    string   // Arabic
  labelFr:  string
  labelEn:  string
  color:    string   // solid background
  text:     string   // always white
  dot:      string   // dropdown dot color (= color)
}

// ── EXACT Octomatic palette (STEP 4) ─────────────────────────
export const STATUSES: Record<string, StatusDef> = {
  pending:   { key:'pending',   label:'معلقة',    labelFr:'En attente', labelEn:'Pending',   color:'#80BCBD', text:'#FFFFFF', dot:'#80BCBD' },
  failed_01: { key:'failed_01', label:'فاشلة 01', labelFr:'Échoué 01',  labelEn:'Failed 01', color:'#FFA447', text:'#FFFFFF', dot:'#FFA447' },
  failed_02: { key:'failed_02', label:'فاشلة 02', labelFr:'Échoué 02',  labelEn:'Failed 02', color:'#FF8C1A', text:'#FFFFFF', dot:'#FF8C1A' },
  failed_03: { key:'failed_03', label:'فاشلة 03', labelFr:'Échoué 03',  labelEn:'Failed 03', color:'#E67300', text:'#FFFFFF', dot:'#E67300' },
  confirmed: { key:'confirmed', label:'مؤكدة',    labelFr:'Confirmé',   labelEn:'Confirmed', color:'#22C55E', text:'#FFFFFF', dot:'#22C55E' },
  cancelled: { key:'cancelled', label:'ملغاة',    labelFr:'Annulé',     labelEn:'Cancelled', color:'#E23024', text:'#FFFFFF', dot:'#E23024' },
  postponed: { key:'postponed', label:'مؤجلة',    labelFr:'Reporté',    labelEn:'Postponed', color:'#9D76C1', text:'#FFFFFF', dot:'#9D76C1' },
  duplicate: { key:'duplicate', label:'مكررة',    labelFr:'Doublon',    labelEn:'Duplicate', color:'#1A1A1A', text:'#FFFFFF', dot:'#1A1A1A' },
}

// ── Aliases so the shared `orders` table values map cleanly ──
// (DB uses failed_1/2/3 + new=pending; UI uses failed_01/02/03 + pending)
const ALIAS: Record<string, string> = {
  failed_1: 'failed_01', failed_2: 'failed_02', failed_3: 'failed_03',
  new: 'pending', '': 'pending',
}

export function normalizeStatus(raw?: string | null): string {
  if (!raw) return 'pending'
  return ALIAS[raw] ?? raw
}

// DB-facing value (what we persist to orders.status)
const TO_DB: Record<string, string> = {
  failed_01: 'failed_1', failed_02: 'failed_2', failed_03: 'failed_3',
}
export function toDbStatus(uiStatus: string): string {
  return TO_DB[uiStatus] ?? uiStatus
}

export function getStatus(raw?: string | null): StatusDef {
  const key = normalizeStatus(raw)
  return STATUSES[key] ?? {
    key, label: raw ?? '—', labelFr: raw ?? '—', labelEn: raw ?? '—',
    color: '#868E96', text: '#FFFFFF', dot: '#868E96',
  }
}

export function statusLabel(raw: string | null | undefined, lang: 'ar'|'fr'|'en' = 'ar'): string {
  const s = getStatus(raw)
  return lang === 'fr' ? s.labelFr : lang === 'en' ? s.labelEn : s.label
}

// Failed escalation: pressing "فاشلة" advances 01 → 02 → 03 (caps at 03)
export function nextFailedStatus(current?: string | null): string {
  const c = normalizeStatus(current)
  if (c === 'failed_01') return 'failed_02'
  if (c === 'failed_02') return 'failed_03'
  if (c === 'failed_03') return 'failed_03'
  return 'failed_01'
}

// Ordered list for dropdowns (matches Octomatic ordering)
export const STATUS_ORDER: string[] = [
  'pending', 'confirmed', 'failed_01', 'failed_02', 'failed_03',
  'postponed', 'cancelled', 'duplicate',
]

export const STATUS_LIST: StatusDef[] = STATUS_ORDER.map(k => STATUSES[k])
