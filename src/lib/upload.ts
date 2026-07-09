import { Platform } from 'react-native'

export const mimeToExt = (mime: string | undefined | null): string | null => {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
  }
  return mime ? map[mime] ?? null : null
}

export async function uriToBlob(uri: string): Promise<Blob> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.blob()
  }
  const res = await fetch(uri)
  return res.blob()
}
