// ============================================================
// GET /api/mobile/v1/dashboard
//
// Deliberately a RE-EXPORT of the web dashboard handler — not a copy.
// The mobile app and the web dashboard therefore execute the SAME
// function, so KPI math, the Africa/Algiers date logic, revenue rules
// (abandoned excluded) and wilaya aggregation can never drift apart.
//
// Auth works for both callers because the analytics route accepts either
// cookies (web) or `Authorization: Bearer` (mobile), and resolves the
// active store from `X-Commerco-Store` with a cookie fallback.
// ============================================================
export const dynamic = 'force-dynamic'

export { GET } from '@/app/api/dashboard/analytics/route'
