import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useNeeds(filters) {
  const [needs, setNeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    fetchNeeds()
  }, [
    filters.ward,
    filters.category,
    filters.urgency,
    filters.sortBy,
  ])

  async function fetchNeeds() {
    // Cancel previous in-flight request
    abortRef.current = true
    setLoading(true)
    setError(null)

    try {
      let query = supabase
  .from('needs')
  .select('*')
  .eq('status', 'active')

if (filters.ward !== 'All Wards')
  query = query.eq('ward', filters.ward)

if (filters.category !== 'All Categories')
  query = query.eq('category', filters.category)

if (filters.urgency !== 'All')
  query = query.eq('urgency', filters.urgency)

if (filters.sortBy === 'urgency_score')
  query = query.order('urgency_score', { ascending: false })
else if (filters.sortBy === 'created_at')
  query = query.order('created_at', { ascending: false })
else if (filters.sortBy === 'report_count')
  query = query.order('report_count', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      console.log('✅ Fetched:', data?.length, 'needs')
      setNeeds(data || [])
    } catch (err) {
      console.error('❌ Fetch error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { needs, loading, error, refetch: fetchNeeds }
}