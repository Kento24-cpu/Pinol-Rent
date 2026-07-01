import '../global.css'
import { Stack } from 'expo-router'
import { PaperProvider } from 'react-native-paper'
import { theme } from '../lib/theme'

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(owner)" />
        <Stack.Screen name="(renter)" />
      </Stack>
    </PaperProvider>
  )
}
