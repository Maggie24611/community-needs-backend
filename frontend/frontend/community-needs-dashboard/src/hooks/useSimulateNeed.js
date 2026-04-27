import { supabase } from '../lib/supabase'

const DEMO_WARDS = [
    { ward: "Dharavi", lat: 19.0422, lng: 72.8570 },
    { ward: "Kurla", lat: 19.0728, lng: 72.8826 },
    { ward: "Dadar", lat: 19.0178, lng: 72.8478 },
    { ward: "Bandra", lat: 19.0544, lng: 72.8557 },
    { ward: "Worli", lat: 19.0178, lng: 72.8178 },
]

const DEMO_CATEGORIES = ["Medical", "Food & water", "Shelter", "Safety"]

export async function simulateNeed() {
    const ward = DEMO_WARDS[Math.floor(Math.random() * DEMO_WARDS.length)]
    const category = DEMO_CATEGORIES[Math.floor(Math.random() * DEMO_CATEGORIES.length)]
    const id = `MUM-DEMO-${Date.now().toString().slice(-4)}`

    const { error } = await supabase
        .from('needs')
        .insert({
            reference_id: id,
            title: `Live demo — ${category} need in ${ward.ward}`,
            summary: `Urgent ${category.toLowerCase()} need reported by resident via WhatsApp. Immediate coordinator attention required.`,
            category,
            urgency: 'Critical',
            urgency_score: 95,
            ward: ward.ward,
            status: 'active',
            report_count: 1,
            affected_count: 25,
            lat: ward.lat + (Math.random() - 0.5) * 0.01,
            lng: ward.lng + (Math.random() - 0.5) * 0.01,
            created_at: new Date().toISOString(),
        })

    if (error) {
        console.error('Simulate error:', error.message)
        return false
    }

    console.log('✅ Demo need inserted:', id)
    return true
}