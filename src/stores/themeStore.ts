import { useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
import { useColorScheme } from 'react-native'

type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'theme_mode'

let globalThemeMode: ThemeMode = 'system'
let listeners: Array<() => void> = []

async function loadTheme(): Promise<ThemeMode> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {}
  return 'system'
}

export function getStoredTheme(): ThemeMode {
  return globalThemeMode
}

export function setStoredTheme(mode: ThemeMode) {
  globalThemeMode = mode
  SecureStore.setItemAsync(STORAGE_KEY, mode).catch(() => {})
  listeners.forEach((fn) => fn())
}

export function useThemeStore(): { themeMode: ThemeMode; setThemeMode: (mode: ThemeMode) => void; resolvedScheme: 'light' | 'dark' } {
  const systemScheme: 'light' | 'dark' = useColorScheme() === 'dark' ? 'dark' : 'light'
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    loadTheme().then((mode) => {
      if (mode !== globalThemeMode) {
        globalThemeMode = mode
        forceUpdate((n) => n + 1)
      }
    })
  }, [])

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1)
    listeners.push(listener)
    return () => { listeners = listeners.filter((l) => l !== listener) }
  }, [])

  const resolvedScheme: 'light' | 'dark' =
    globalThemeMode === 'system' ? systemScheme : globalThemeMode

  return {
    themeMode: globalThemeMode,
    setThemeMode: setStoredTheme,
    resolvedScheme,
  }
}
