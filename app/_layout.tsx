import { Stack } from 'expo-router'
import { PaperProvider } from 'react-native-paper'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { theme } from '../src/lib/theme'
import { useAuth } from '../src/hooks/useAuth'
import { usePushNotifications } from '../src/hooks/usePushNotifications'
import { NetworkProvider } from '../src/hooks/useNetwork'
import { ErrorBoundary } from '../src/components/ErrorBoundary'

export default function RootLayout() {
  useAuth()
  usePushNotifications()

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
              <Stack.Screen name="(admin)" />
            </Stack>
          </ErrorBoundary>
        </NetworkProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  )
}
