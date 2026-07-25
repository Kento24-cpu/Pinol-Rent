import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system'

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

export const MAX_IMAGE_SIZE_MB = 10
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function validateImage(mimeType: string | null | undefined, sizeBytes?: number): void {
  if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error('Formato de imagen no soportado. Usa JPG, PNG o WebP.')
  }
  if (sizeBytes && sizeBytes > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(`La imagen excede el límite de ${MAX_IMAGE_SIZE_MB}MB.`)
  }
}

export async function uriToBlob(uri: string): Promise<Blob> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    validateImage(blob.type, blob.size)
    return blob
  }
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  })
  const mimeType = mimeToExt(uri.split('.').pop() ?? null) ?? 'image/jpeg'
  validateImage(mimeType, base64.length * 0.75)
  const byteChars = atob(base64)
  const byteArrays = []
  for (let offset = 0; offset < byteChars.length; offset += 512) {
    const slice = byteChars.slice(offset, offset + 512)
    const byteNumbers = new Array(slice.length)
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }
    byteArrays.push(new Uint8Array(byteNumbers))
  }
  return new Blob(byteArrays, { type: mimeType })
}
