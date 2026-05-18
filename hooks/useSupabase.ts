'use client'
import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

let client: ReturnType<typeof createClient> | null = null

export function useSupabase() {
  return useMemo(() => {
    if (!client) client = createClient()
    return client
  }, [])
}
