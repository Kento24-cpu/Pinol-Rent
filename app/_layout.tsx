import '../global.css'
import { Stack } from 'expo-router'
import { PaperProvider } from 'react-native-paper'
import { StatusBar } from 'expo-status-bar'
import { theme } from '../src/lib/theme'
import { useAuth } from '../src/hooks/useAuth'

export default function RootLayout() {
  useAuth()

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(owner)" />
        <Stack.Screen name="(renter)" />
      </Stack>
    </PaperProvider>
  )
}
