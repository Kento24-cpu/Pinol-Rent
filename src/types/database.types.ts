// Manual type overrides for tables not yet in generated Database types

export interface Department {
  id: number
  name: string
  slug: string
}

export interface Tag {
  id: number
  name: string
  slug: string
}

export interface CarTag {
  car_id: number
  tag_id: number
}

export interface CarWithRelations {
  id: number
  brand: string
  model: string
  year: number
  color: string | null
  price_per_day: number
  location: string | null
  description: string | null
  image_url: string | null
  available: boolean
  department_id: number | null
  owner_id: string
  created_at: string | null
  department: { name: string } | null
  profile: { full_name: string; business_name: string | null; phone: string | null } | null
  car_tags: { tag: { name: string; slug: string } }[]
}
