import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const ANDROID_CHANNEL_ID = 'messages'

interface PushMessage {
  to: string
  sound: 'default'
  title: string
  body: string
  data: Record<string, unknown>
  channelId?: string
}

/**
 * Returns the push tokens of a user only if the given preference is enabled
 * (missing pref row defaults to enabled).
 */
export async function pushTokensForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  pref: 'chat_push' | 'booking_push',
): Promise<{ token: string }[]> {
  const { data: prefs } = await supabase
    .from('notification_prefs')
    .select(pref)
    .eq('user_id', userId)
    .maybeSingle()

  if (prefs && prefs[pref] === false) return []

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)

  return tokens ?? []
}

export async function sendPush(
  supabaseUrl: string,
  supabaseKey: string,
  messages: PushMessage[],
): Promise<void> {
  if (messages.length === 0) return

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })
  if (!res.ok) return

  const result = await res.json() as { data?: { status: string; details?: { error?: string } }[] }
  if (!result.data) return

  const tokensToRemove: string[] = []
  for (let i = 0; i < result.data.length; i++) {
    const receipt = result.data[i]
    if (receipt?.status === 'error' && receipt?.details?.error === 'DeviceNotRegistered') {
      tokensToRemove.push(messages[i].to)
    }
  }
  if (tokensToRemove.length === 0) return

  const supabase = createClient(supabaseUrl, supabaseKey)
  await supabase.from('push_tokens').delete().in('token', tokensToRemove)
}
