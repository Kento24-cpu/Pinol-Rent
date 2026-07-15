import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device')
    return null
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Mensajes',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied')
    return null
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId

  if (!projectId) {
    console.log('No EAS project ID configured — skipping push token registration')
    return null
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
    return tokenData.data
  } catch (e) {
    console.log('Failed to get push token:', e)
    return null
  }
}

function navigateFromNotification(data: Record<string, unknown>) {
  const type = data.type as string | undefined
  const bookingId = data.booking_id as number | undefined
  const conversationId = data.conversation_id as number | undefined
  const carId = data.car_id as number | undefined
  const role = useAuthStore.getState().role

  const group = role === 'owner' ? '/(owner)' : '/(renter)'

  if (type === 'booking' && bookingId) {
    router.navigate(`${group}/bookings/${bookingId}`)
  } else if (type === 'chat' && conversationId) {
    router.navigate(`${group}/conversations/${conversationId}`)
  } else if (carId) {
    router.navigate(`${group}/${carId}`)
  }
}

export function usePushNotifications() {
  const user = useAuthStore((s) => s.session?.user)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    registerForPushNotifications().then(async (token) => {
      if (!token || cancelled) return
      try {
        const { error: deleteError } = await supabase
          .from('push_tokens')
          .delete()
          .eq('user_id', user.id)
        if (deleteError) {
          console.error('Failed to clear old push token:', deleteError)
          return
        }
        const { error: insertError } = await supabase
          .from('push_tokens')
          .insert({ user_id: user.id, token, platform: 'expo' })
        if (insertError) {
          console.error('Failed to save push token:', insertError)
        }
      } catch (e) {
        console.error('Failed to register push token:', e)
      }
    })

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotification(response.notification.request.content.data ?? {})
    })

    if (Platform.OS !== 'web') {
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response && !cancelled) {
          navigateFromNotification(response.notification.request.content.data ?? {})
        }
      })
    }

    return () => {
      cancelled = true
      sub.remove()
    }
  }, [user])
}

export { navigateFromNotification }