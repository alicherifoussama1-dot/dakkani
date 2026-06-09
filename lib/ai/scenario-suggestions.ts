// ============================================================
// Scenario suggestions for the AI Photo Studio
// Client-safe — pure data, no API keys, no server imports.
// ============================================================

export const SCENARIO_SUGGESTIONS: Record<string, { label: string; value: string }[]> = {
  'أزياء': [
    { label: 'استوديو راقي بإضاءة ناعمة',   value: 'elegant fashion studio with soft diffused lighting and clean background' },
    { label: 'مشهد لايف ستايل في مقهى أنيق', value: 'lifestyle scene in a cozy upscale Algerian café with warm ambient lighting' },
    { label: 'خلفية بيضاء احترافية',         value: 'clean pure white studio backdrop with subtle shadows' },
    { label: 'مشهد في حديقة ربيعية',         value: 'spring garden setting with natural flowers and soft bokeh background' },
  ],
  'حجاب': [
    { label: 'استوديو بإضاءة ناعمة فاخرة',   value: 'luxury fashion studio with soft white and gold lighting, minimal background' },
    { label: 'مشهد منزلي أنيق',               value: 'elegant home interior setting with soft natural light' },
    { label: 'خلفية تدرج باستيل',             value: 'soft pastel gradient background, elegant and premium' },
    { label: 'لايف ستايل في حديقة',           value: 'beautiful outdoor garden with soft bokeh and natural warm light' },
  ],
  'إلكترونيات': [
    { label: 'استوديو تك أبيض نظيف',          value: 'clean white tech studio backdrop, sharp lighting, professional catalog' },
    { label: 'مكتب مرتب عصري',                value: 'modern organized desk setup with natural daylight from window' },
    { label: 'خلفية داكنة بريميوم',           value: 'dark premium background with dramatic studio lighting and product reflection' },
    { label: 'لايف ستايل حياة يومية',         value: 'everyday lifestyle setting showing product in natural use context' },
  ],
  'تجميل': [
    { label: 'استوديو فاخر أبيض ووردي',       value: 'luxury beauty studio, clean white marble with rose gold accents, soft lighting' },
    { label: 'مشهد صباحي في الحمام',          value: 'morning bathroom scene with natural light and elegant styling' },
    { label: 'خلفية أزهار وعطور',             value: 'floral flat-lay with flowers and beauty props, soft overhead lighting' },
    { label: 'بريميوم داكن فاخر',             value: 'dark luxury premium background with spotlight and elegant reflection' },
  ],
  'منزل': [
    { label: 'غرفة معيشة أنيقة',              value: 'elegant Algerian living room with modern decor and warm lighting' },
    { label: 'فضاء أبيض مرتب',               value: 'clean organized white interior space with natural light' },
    { label: 'لايف ستايل في المطبخ',          value: 'cozy kitchen lifestyle scene with warm natural lighting' },
    { label: 'خلفية نيتشر طبيعية',           value: 'natural outdoor setting with wood and greenery elements' },
  ],
}

export const DEFAULT_SCENARIOS: { label: string; value: string }[] = [
  { label: 'خلفية بيضاء احترافية',   value: 'clean white studio backdrop with professional lighting and subtle shadow' },
  { label: 'خلفية تدرج ناعم',        value: 'soft pastel gradient background, light beige to white, premium feel' },
  { label: 'مشهد لايف ستايل طبيعي',  value: 'realistic lifestyle setting appropriate for the product, natural light' },
  { label: 'خلفية داكنة بريميوم',    value: 'dark dramatic premium background, spotlight lighting, luxury feel' },
]
