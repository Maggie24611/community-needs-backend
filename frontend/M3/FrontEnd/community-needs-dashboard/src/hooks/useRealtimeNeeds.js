import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtimeNeeds(onNewNeed) {
  useEffect(() => {
    const channel = supabase
      .channel('needs-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'needs' },
        (payload) => {
          console.log('🔴 New need via Realtime:', payload.new)
          // Only show active needs
          if (payload.new.status === 'active' || !payload.new.status) {
            onNewNeed(payload.new)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'needs' },
        (payload) => {
          console.log('🟡 Need updated:', payload.new)
          // If status changed to resolved, remove it
          if (payload.new.status === 'resolved') {
            onNewNeed({ ...payload.new, _resolved: true })
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime:', status)
      })

    return () => supabase.removeChannel(channel)
  }, [])
}