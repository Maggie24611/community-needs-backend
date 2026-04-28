import { supabase } from '../lib/supabase'

export async function followUpNeed(needId) {
    console.log('Following up on need:', needId)

    const { data, error } = await supabase
        .from('needs')
        .update({
            status: 'in_progress',
        })
        .eq('reference_id', needId)
        .select()

    if (error) {
        console.error('❌ Follow up failed:', error.message)
        return false
    }

    console.log('✅ Follow up logged:', data)
    return true
}