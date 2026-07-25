import { Stack } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { PaperProvider } from 'react-native-paper'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { getTheme } from '../src/lib/theme'
import { useThemeStore } from '../src/stores/themeStore'
import { useAuth } from '../src/hooks/useAuth'
import { usePushNotifications } from '../src/hooks/usePushNotifications'
import { NetworkProvider } from '../src/hooks/useNetwork'
import { ErrorBoundary } from '../src/components/ErrorBoundary'
import { isSupabaseConfigured } from '../src/lib/supabase'

function EnvGuard({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured()) return children
  return (
    <View style={envStyles.center}>
      <Text style={envStyles.title}>Error de configuración</Text>
      <Text style={envStyles.message}>
        Faltan las variables de entorno EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
      </Text>
      <Text style={envStyles.hint}>
        Asegúrate de que estén configuradas en tu archivo .env o en los secrets de EAS.
      </Text>
    </View>
  )
}

const envStyles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  message: { fontSize: 14, textAlign: 'center', marginBottom: 24, opacity: 0.6 },
  hint: { fontSize: 12, textAlign: 'center', opacity: 0.4 },
})

export default function RootLayout() {
  const { resolvedScheme } = useThemeStore()
  const theme = getTheme(resolvedScheme)
  useAuth()
  usePushNotifications()

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <NetworkProvider>
          <ErrorBoundary>
            <EnvGuard>
              <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(public)" />
                <Stack.Screen name="(owner)" />
                <Stack.Screen name="(renter)" />
                <Stack.Screen name="(admin)" />
              </Stack>
            </EnvGuard>
          </ErrorBoundary>
        </NetworkProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  )
}
