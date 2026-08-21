import { Snackbar } from 'react-native-paper'

interface ErrorSnackbarProps {
  error: string | null
  onDismiss: () => void
  duration?: number
}

export function ErrorSnackbar({ error, onDismiss, duration = 4000 }: ErrorSnackbarProps) {
  return (
    <Snackbar visible={!!error} onDismiss={onDismiss} duration={duration} style={{ marginBottom: 8 }}>
      {error}
    </Snackbar>
  )
}
