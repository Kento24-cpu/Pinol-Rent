import { View, StyleSheet } from 'react-native'
import { Text, Button } from 'react-native-paper'
import { router } from 'expo-router'

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.emoji}>🤷</Text>
      <Text variant="titleLarge" style={styles.title}>Página no encontrada</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>La página que buscas no existe</Text>
      <Button mode="contained" onPress={() => router.replace('/(public)/login')} style={styles.button}>
        Ir al inicio
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emoji: { marginBottom: 16 },
  title: { fontWeight: 'bold', marginBottom: 8 },
  subtitle: { marginBottom: 24, opacity: 0.6 },
  button: { borderRadius: 12 },
})
