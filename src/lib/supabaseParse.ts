import { z } from 'zod'

/**
 * Parse a Supabase query result into typed rows with a runtime guard.
 *
 * Supabase join queries return loosely-typed data; instead of casting with
 * `as unknown as`, we validate the shape at runtime and fall back to an empty
 * list when the payload does not match. This surfaces schema drift as a warning
 * rather than a silent runtime crash deeper in the UI.
 */
export function parseRows<T>(data: unknown, schema: z.ZodType<T>): T[] {
  if (data == null) return []
  const result = schema.array().safeParse(data)
  if (!result.success) {
    console.warn('[parseRows] unexpected row shape, ignoring results:', result.error.message)
    return []
  }
  return result.data
}

export function parseRow<T>(data: unknown, schema: z.ZodType<T>): T | null {
  if (data == null) return null
  const result = schema.safeParse(data)
  return result.success ? result.data : null
}
