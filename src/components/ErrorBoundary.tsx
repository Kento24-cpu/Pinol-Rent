import { Component, type ReactNode, type ErrorInfo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Button } from 'react-native-paper'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Algo salió mal</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Button mode="contained" onPress={this.handleReset} style={styles.button}>
            Reintentar
          </Button>
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  message: { fontSize: 14, textAlign: 'center', marginBottom: 24, opacity: 0.6 },
  button: { borderRadius: 12 },
})
