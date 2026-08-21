import { z } from 'zod'

export const carFormSchema = z.object({
  brand: z.string().min(1, 'Requerido'),
  model: z.string().min(1, 'Requerido'),
  year: z.string().refine(
    (v) => { const n = parseInt(v, 10); return !isNaN(n) && n >= 2000 && n <= 2030 },
    'Año inválido (2000-2030)',
  ),
  color: z.string().optional(),
  price_per_day: z.string().refine(
    (v) => { const n = parseFloat(v); return !isNaN(n) && n > 0 },
    'Precio inválido',
  ),
  deposit: z.string().optional().refine(
    (v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0),
    'Depósito inválido',
  ),
  location: z.string().optional(),
  description: z.string().optional(),
})

export type CarForm = z.infer<typeof carFormSchema>
