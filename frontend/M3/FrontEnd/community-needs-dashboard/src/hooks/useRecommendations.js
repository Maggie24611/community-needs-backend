import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const { data, error } = await supabase
          .from('recommendations')
          .select('*')
          .order('generated_at', { ascending: false })
          .limit(1)

        if (error) throw error
        setRecommendations(data?.[0]?.recommendations || [])
      } catch (err) {
        console.error('Recommendations error:', err.message)
        setRecommendations([])
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  return { recommendations, loading }
}