import { supabase } from './supabase'

export async function findOrCreateConversation(carId: number, ownerId: string, renterId: string): Promise<number> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('car_id', carId)
    .eq('renter_id', renterId)
    .eq('owner_id', ownerId)
    .maybeSingle()

  if (existing) return existing.id

  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({ car_id: carId, renter_id: renterId, owner_id: ownerId })
    .select('id')
    .single()

  if (error || !newConv) throw new Error(error?.message ?? 'Failed to create conversation')
  return newConv.id
}
