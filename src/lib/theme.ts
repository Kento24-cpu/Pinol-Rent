import { MD3LightTheme } from 'react-native-paper'

const palette = {
  primary: '#1565C0',
  primaryLight: '#1E88E5',
  primaryBg: '#E3F2FD',
  accent: '#00ACC1',
  neutral900: '#0D1B2A',
  neutral600: '#546E7A',
  neutral200: '#CFD8DC',
  neutral50: '#F5F7FA',
  success: '#2E7D32',
  error: '#C62828',
}

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.primary,
    primaryContainer: palette.primaryBg,
    secondary: palette.accent,
    tertiary: palette.primaryLight,
    background: palette.neutral50,
    surface: '#FFFFFF',
    surfaceVariant: palette.neutral50,
    error: palette.error,
    onPrimary: '#FFFFFF',
    onPrimaryContainer: palette.primary,
    onSecondary: '#FFFFFF',
    onBackground: palette.neutral900,
    onSurface: palette.neutral900,
    onSurfaceVariant: palette.neutral600,
    outline: palette.neutral200,
    outlineVariant: palette.neutral200,
  },
  roundness: 12,
}
