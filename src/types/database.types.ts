export interface CarWithRelations {
  id: number
  brand: string
  model: string
  year: number
  color: string | null
  price_per_day: number
  deposit_per_day: number | null
  location: string | null
  description: string | null
  image_url: string | null
  available: boolean | null
  department_id: number | null
  owner_id: string
  avg_rating: number | null
  reviews_count: number | null
  created_at: string | null
  department: { name: string } | null
  profile: { full_name: string | null; business_name: string | null; phone: string | null; cedula: string | null } | null
  car_tags: { tag: { name: string; slug: string } }[]
}

export interface ConversationWithLatest {
  id: number
  car_id: number
  renter_id: string
  owner_id: string
  booking_id: number | null
  last_message_at: string | null
  created_at: string | null
  car: { brand: string; model: string; image_url: string | null } | null
  renter: { full_name: string; avatar_url: string | null } | null
  owner: { full_name: string | null; avatar_url: string | null } | null
  latest_message: { content: string | null; created_at: string | null; sender_id: string }[] | { content: string | null; created_at: string | null; sender_id: string } | null
  unread_count?: number
}

export interface BookingWithRelations {
  id: number
  car_id: number
  renter_id: string
  start_date: string
  end_date: string
  total_price: number
  unit_price: number | null
  renter_service_fee: number | null
  owner_commission: number | null
  owner_net_total: number | null
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'pending_payment'
  created_at: string | null
  car: { brand: string; model: string; image_url: string | null; price_per_day: number } | null
  renter: { full_name: string; avatar_url: string | null } | null
  owner?: { full_name: string | null; avatar_url: string | null } | null
}

export interface ReviewWithRelations {
  id: number
  booking_id: number
  car_id: number
  renter_id: string
  rating: number
  comment: string | null
  created_at: string | null
  renter: { full_name: string; avatar_url: string | null } | null
}

export interface MessageWithSender {
  id: number
  conversation_id: number
  sender_id: string
  content: string
  attachment_url: string | null
  read_at: string | null
  created_at: string | null
  sender: { full_name: string | null; avatar_url: string | null } | null
  attachment_signed_url?: string | null
}
