import { Alert, Platform } from 'react-native'

// Alert.alert is a no-op on react-native-web, so fall back to window.alert
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title)
    return
  }
  Alert.alert(title, message)
}
