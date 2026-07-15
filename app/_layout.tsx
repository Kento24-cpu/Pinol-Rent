import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { PaperProvider } from 'react-native-paper'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { theme } from '../src/lib/theme'
import { useAuth } from '../src/hooks/useAuth'
import { usePushNotifications } from '../src/hooks/usePushNotifications'
import { NetworkProvider } from '../src/hooks/useNetwork'
import { ErrorBoundary } from '../src/components/ErrorBoundary'
import { clearStaleCache } from '../src/lib/db'

export default function RootLayout() {
  useAuth()
  usePushNotifications()

  useEffect(() => {
    clearStaleCache()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <NetworkProvider>
          <ErrorBoundary>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(public)" />
              <Stack.Screen name="(owner)" />
              <Stack.Screen name="(renter)" />
            </Stack>
          </ErrorBoundary>
        </NetworkProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  )
}
