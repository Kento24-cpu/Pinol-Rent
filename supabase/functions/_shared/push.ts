import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface PushMessage {
  to: string
  sound: 'default'
  title: string
  body: string
  data: Record<string, unknown>
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
