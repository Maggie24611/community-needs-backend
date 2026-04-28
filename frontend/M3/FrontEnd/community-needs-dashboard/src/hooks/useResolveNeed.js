import { supabase } from '../lib/supabase'

export async function resolveNeed(needId) {
  console.log('Resolving need:', needId)

  const { data, error } = await supabase
    .from('needs')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('reference_id', needId)
    .select()

  if (error) {
    console.error('❌ Resolve failed:', error.message)
    return false
  }

  console.log('✅ Resolved successfully:', data)
  return true
}