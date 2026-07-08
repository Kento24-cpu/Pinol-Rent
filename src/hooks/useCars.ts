import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { CarWithRelations } from '../types/database.types'

interface FlatCar {
  id: number
  brand: string
  model: string
  year: number
  price_per_day: number
  available: boolean
  department_name: string
  business_name: string | null
  owner_full_name: string
  tags: { name: string }[]
  image_url?: string | null
}

interface UseCarsOptions {
  ownerId?: string
  departmentId?: number | null
  searchQuery?: string
}

export function useCars(options?: UseCarsOptions) {
  const [cars, setCars] = useState<FlatCar[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const genRef = useRef(0)

  const fetchCars = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    const gen = ++genRef.current

    const select = 'id, brand, model, year, price_per_day, available, image_url, description, department:department_id(name), profile:owner_id(full_name, business_name), car_tags(tag:tag_id(name))'

    let q = supabase
      .from('cars')
      .select(select)
      .order('created_at', { ascending: false })
      .limit(50)

    if (options?.ownerId) {
      q = q.eq('owner_id', options.ownerId)
    } else {
      q = q.eq('available', true)
    }
    if (options?.departmentId) {
      q = q.eq('department_id', options.departmentId)
    }
    if (options?.searchQuery) {
      const like = `%${options.searchQuery}%`
      q = q.or(`brand.ilike.${like},model.ilike.${like}`)
    }

    const { data, error: fetchError } = await q
    if (gen !== genRef.current) return
    if (fetchError) {
      setError(fetchError.message)
    } else if (data) {
      setError(null)
      setCars((data as unknown as CarWithRelations[]).map((c) => ({
        id: c.id,
        brand: c.brand,
        model: c.model,
        year: c.year,
        price_per_day: c.price_per_day,
        available: c.available ?? true,
        department_name: c.department?.name ?? '',
        business_name: c.profile?.business_name ?? null,
        owner_full_name: c.profile?.full_name ?? '',
        tags: c.car_tags?.map((ct) => ({ name: ct.tag.name })) ?? [],
        image_url: c.image_url,
      })))
    }
    if (gen === genRef.current) {
      setLoading(false)
      setRefreshing(false)
    }
  }, [options?.ownerId, options?.departmentId, options?.searchQuery])

  const clearError = () => setError(null)

  const cancel = useCallback(() => { genRef.current++ }, [])

  return { cars, loading, refreshing, error, fetchCars, cancel, clearError }
}
