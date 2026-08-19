import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper'
import type { MD3Theme } from 'react-native-paper'

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
  rating: '#FFB300',
}

const darkPalette = {
  primary: '#5C9CE6',
  primaryLight: '#90CAF9',
  primaryBg: '#1A3A5C',
  accent: '#4DD0E1',
  neutral900: '#E8EAF6',
  neutral600: '#B0BEC5',
  neutral200: '#37474F',
  neutral50: '#121212',
  success: '#66BB6A',
  error: '#EF5350',
  rating: '#FFD54F',
}

export const RATING_COLOR = palette.rating
export const DARK_RATING_COLOR = darkPalette.rating

export function formatCurrency(n: number): string {
  try { return n.toLocaleString('es-NI') } catch { return n.toLocaleString() }
}

export function formatDateLocale(date: Date): string {
  try { return date.toLocaleString('es-NI') } catch { return date.toLocaleString() }
}

function buildTheme(base: typeof MD3LightTheme, colors: typeof palette): MD3Theme {
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      primaryContainer: colors.primaryBg,
      secondary: colors.accent,
      tertiary: colors.primaryLight,
      background: colors.neutral50,
      surface: base === MD3LightTheme ? '#FFFFFF' : '#1E1E1E',
      surfaceVariant: colors.neutral50,
      error: colors.error,
      onPrimary: '#FFFFFF',
      onPrimaryContainer: colors.primary === palette.primary ? palette.primary : darkPalette.primaryLight,
      onSecondary: '#FFFFFF',
      onBackground: colors.neutral900,
      onSurface: colors.neutral900,
      onSurfaceVariant: colors.neutral600,
      outline: colors.neutral200,
      outlineVariant: colors.neutral200,
    },
    roundness: 12,
  }
}

export const lightTheme = buildTheme(MD3LightTheme, palette)
export const darkTheme = buildTheme(MD3DarkTheme, darkPalette)

export function getTheme(colorScheme: string | undefined | null): MD3Theme {
  return colorScheme === 'dark' ? darkTheme : lightTheme
}

export const breakpoints = { tablet: 768, desktop: 1024 } as const

export const contentMaxWidth = { form: 720, detail: 840, list: 1200 } as const
