import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { cacheCars, getCachedCars } from '../lib/db'
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
  avg_rating: number
  reviews_count: number
  image_url?: string | null
}

export interface UseCarsOptions {
  ownerId?: string
  departmentId?: number | null
  searchQuery?: string
  priceMin?: number
  priceMax?: number
  tagIds?: number[]
  sortBy?: 'newest' | 'price_asc' | 'price_desc'
  location?: string
}

const PAGE_SIZE = 20

async function getCarIdsByTags(tagIds: number[], gen: number, genRef: React.MutableRefObject<number>): Promise<number[] | null> {
  const { data } = await supabase
    .from('car_tags')
    .select('car_id')
    .in('tag_id', tagIds)
  if (gen !== genRef.current) return null
  return [...new Set(data?.map((ct) => ct.car_id) ?? [])]
}

function buildCarQuery(select: string, options: UseCarsOptions | undefined, start: number, end: number, carIds?: number[]) {
  let q = supabase.from('cars').select(select).range(start, end)

  switch (options?.sortBy) {
    case 'price_asc':
      q = q.order('price_per_day', { ascending: true })
      break
    case 'price_desc':
      q = q.order('price_per_day', { ascending: false })
      break
    default:
      q = q.order('created_at', { ascending: false })
  }

  if (options?.ownerId) {
    q = q.eq('owner_id', options.ownerId)
  } else {
    q = q.eq('available', true)
  }
  if (options?.departmentId) {
    q = q.eq('department_id', options.departmentId)
  }
  if (options?.priceMin) {
    q = q.gte('price_per_day', options.priceMin)
  }
  if (options?.priceMax) {
    q = q.lte('price_per_day', options.priceMax)
  }
  if (options?.location) {
    q = q.ilike('location', `%${options.location}%`)
  }
  if (carIds?.length) {
    q = q.in('id', carIds)
  }
  if (options?.searchQuery) {
    const like = `%${options.searchQuery}%`
    q = q.or(`brand.ilike.${like},model.ilike.${like}`)
  }

  return q
}

function mapCar(c: CarWithRelations): FlatCar {
  return {
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
    avg_rating: c.avg_rating ?? 0,
    reviews_count: c.reviews_count ?? 0,
    image_url: c.image_url,
  }
}

const SELECT = 'id, brand, model, year, price_per_day, available, image_url, avg_rating, reviews_count, department:department_id(name), profile:owner_id(full_name, business_name), car_tags(tag:tag_id(name))'

export function useCars(options?: UseCarsOptions) {
  const [cars, setCars] = useState<FlatCar[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const genRef = useRef(0)
  const pageRef = useRef(0)
  const hasMoreRef = useRef(true)
  const optsRef = useRef(options)
  optsRef.current = options

  const runQuery = useCallback(async (start: number, isRefresh: boolean): Promise<FlatCar[] | null> => {
    const gen = ++genRef.current
    const opts = optsRef.current

    let carIds: number[] | undefined
    if (opts?.tagIds?.length) {
      const ids = await getCarIdsByTags(opts.tagIds, gen, genRef)
      if (ids === null) return null
      if (ids.length === 0) return []
      carIds = ids
    }

    const q = buildCarQuery(SELECT, opts, start, start + PAGE_SIZE - 1, carIds)
    const { data, error: fetchError } = await q
    if (gen !== genRef.current) return null
    if (fetchError) {
      if (start === 0) {
        const cached = await getCachedCars()
        if (cached.length > 0)           return cached.map((c) => ({
          id: c.id, brand: c.brand, model: c.model, year: c.year,
          price_per_day: c.price_per_day, department_name: c.department_name,
          image_url: c.image_url, avg_rating: c.avg_rating, reviews_count: c.reviews_count,
          available: true, business_name: null, owner_full_name: '', tags: [],
        })) as FlatCar[]
      }
      setError(fetchError.message)
      return null
    }
    setError(null)
    const mapped = (data as unknown as CarWithRelations[]).map(mapCar)
    if (start === 0) {
      const toCache = mapped.map((c: FlatCar) => ({
        id: c.id, brand: c.brand, model: c.model, year: c.year,
        price_per_day: c.price_per_day, department_name: c.department_name,
        image_url: c.image_url ?? null, avg_rating: c.avg_rating, reviews_count: c.reviews_count,
      }))
      cacheCars(toCache).catch((e) => console.error('Failed to cache cars:', e))
    }
    return mapped
  }, [])

  const fetchCars = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    pageRef.current = 0
    hasMoreRef.current = true

    const result = await runQuery(0, false)
    if (result === null) return
    setCars(result)
    hasMoreRef.current = result.length >= PAGE_SIZE
    setLoading(false)
    setRefreshing(false)
  }, [runQuery])

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || loading || refreshing) return
    const nextPage = pageRef.current + 1
    const result = await runQuery(nextPage * PAGE_SIZE, false)
    if (result === null || result.length === 0) return
    hasMoreRef.current = result.length >= PAGE_SIZE
    pageRef.current = nextPage
    setCars((prev) => [...prev, ...result])
  }, [runQuery, loading, refreshing])

  const clearError = () => setError(null)

  const cancel = useCallback(() => { genRef.current++ }, [])

  return { cars, loading, refreshing, error, fetchCars, loadMore, cancel, clearError }
}
