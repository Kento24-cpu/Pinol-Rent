import { supabase } from './supabase'

async function ensureProfile(userId: string, fullName?: string): Promise<void> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (existing) return

  if (!fullName) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id === userId) {
      const meta = user.user_metadata
      fullName = (meta?.full_name as string) ?? user.email?.split('@')[0] ?? 'Usuario'
    } else {
      fullName = 'Usuario'
    }
  }

  const { error } = await supabase.from('profiles').insert({
    id: userId,
    full_name: fullName,
    role: 'renter',
  })

  if (error && !error.message.includes('duplicate key')) {
    throw error
  }
}

export async function findOrCreateConversation(
  carId: number,
  ownerId: string,
  renterId: string,
  ownerName?: string
): Promise<number> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('car_id', carId)
    .eq('renter_id', renterId)
    .eq('owner_id', ownerId)
    .maybeSingle()

  if (existing) return existing.id

  await Promise.all([
    ensureProfile(renterId),
    ensureProfile(ownerId, ownerName),
  ])

  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({ car_id: carId, renter_id: renterId, owner_id: ownerId })
    .select('id')
    .single()

  if (error || !newConv) throw new Error(error?.message ?? 'Failed to create conversation')
  return newConv.id
}
