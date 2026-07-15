// The middleware always rewrites `/` to /landing/index.html (v6 cinematic
// scroll film in public/landing). This component is a compile-time fallback
// only — it never renders in production, but Next.js requires a valid page
// module for the route to exist.
import { redirect } from 'next/navigation'

export const dynamic = 'force-static'

export default function HomeFallback() {
  redirect('/landing/index.html')
}
