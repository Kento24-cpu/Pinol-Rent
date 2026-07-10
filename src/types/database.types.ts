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
  available: boolean | null
  department_id: number | null
  owner_id: string
  created_at: string | null
  department: { name: string } | null
  profile: { full_name: string; business_name: string | null; phone: string | null } | null
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
  owner: { full_name: string; avatar_url: string | null } | null
  latest_message: { content: string; created_at: string | null; sender_id: string } | null
  unread_count?: number
}

export interface MessageWithSender {
  id: number
  conversation_id: number
  sender_id: string
  content: string
  attachment_url: string | null
  read_at: string | null
  created_at: string | null
  sender: { full_name: string; avatar_url: string | null } | null
}
