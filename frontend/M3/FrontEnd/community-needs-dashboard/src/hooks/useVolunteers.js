import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useVolunteers(ward, category) {
    const [volunteers, setVolunteers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!ward) return
        fetchVolunteers()
    }, [ward, category])

    async function fetchVolunteers() {
        setLoading(true)
        try {
            let query = supabase
                .from('volunteers')
                .select('*')
                .eq('opted_in', true)

            if (ward) query = query.eq('ward', ward)

            const { data, error } = await query
            if (error) throw error

            // Filter by category match if possible
            const matched = (data || []).filter(v => {
                if (!category) return true
                const cats = Array.isArray(v.categories)
                    ? v.categories
                    : (v.categories || '').split(',').map(c => c.trim())
                return cats.some(c =>
                    c.toLowerCase().includes(category.toLowerCase()) ||
                    category.toLowerCase().includes(c.toLowerCase())
                )
            })

            // If no category match, show all ward volunteers
            setVolunteers(matched.length > 0 ? matched : (data || []))
        } catch (err) {
            console.error('Volunteers error:', err.message)
            setVolunteers([])
        } finally {
            setLoading(false)
        }
    }

    return { volunteers, loading }
}