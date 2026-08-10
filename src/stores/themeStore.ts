import { useState, useEffect } from 'react'
import { Platform, useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'

type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'theme_mode'

// SecureStore is a no-op on web (its methods reject), so use localStorage there
const storage = {
  getItem: async (key: string) =>
    Platform.OS === 'web' ? (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null) : SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
      return
    }
    return SecureStore.setItemAsync(key, value)
  },
}

let globalThemeMode: ThemeMode = 'system'
let listeners: (() => void)[] = []

async function loadTheme(): Promise<ThemeMode> {
  try {
    const stored = await storage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {}
  return 'system'
}

export function getStoredTheme(): ThemeMode {
  return globalThemeMode
}

export function setStoredTheme(mode: ThemeMode) {
  globalThemeMode = mode
  storage.setItem(STORAGE_KEY, mode).catch(() => {})
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
