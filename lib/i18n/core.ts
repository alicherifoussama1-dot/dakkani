// ============================================================
// i18n core — framework-agnostic translator.
// Nested JSON catalogs, dot-path keys, {param} interpolation,
// and simple {count}-based pluralization via `key` / `key_plural`.
// Missing keys fall back to the key itself (dev-visible).
// ============================================================
export type Messages = Record<string, any>

export function lookup(messages: Messages, path: string): unknown {
  return path.split('.').reduce<any>((acc, part) => (acc == null ? undefined : acc[part]), messages)
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`))
}

export type Translator = (key: string, params?: Record<string, string | number>) => string

/** Build a translator bound to one locale's merged messages. */
export function createTranslator(messages: Messages): Translator {
  return (key, params) => {
    let val = lookup(messages, key)
    // Pluralization: prefer `<key>_plural` when count !== 1.
    if (params && typeof params.count === 'number' && params.count !== 1) {
      const plural = lookup(messages, `${key}_plural`)
      if (typeof plural === 'string') val = plural
    }
    if (typeof val !== 'string') return key // fallback: show the key
    return interpolate(val, params)
  }
}
