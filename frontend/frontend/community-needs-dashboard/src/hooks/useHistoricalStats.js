import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useHistoricalStats() {
  const [stats, setStats] = useState({ count: 0, wardCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const { count } = await supabase
          .from('historical_data')
          .select('*', { count: 'exact', head: true })

        const { data: wardsData } = await supabase
          .from('historical_data')
          .select('ward')

        const uniqueWards = new Set((wardsData || []).map(r => r.ward)).size

        setStats({ count: count || 0, wardCount: uniqueWards })
      } catch (err) {
        console.error('Historical stats error:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  return { stats, loading }
}