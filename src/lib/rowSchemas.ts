import { z } from 'zod'
import type {
  CarWithRelations,
  ConversationWithLatest,
  BookingWithRelations,
  ReviewWithRelations,
  MessageWithSender,
} from '../types/database.types'

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

/**
 * Lenient structural validators for the shapes returned by Supabase join
 * queries. They intentionally check only the fields the app reads (and that the
 * row is a plausible object), so normal schema evolution won't trip them while
 * gross shape drift (e.g. a broken join or renamed column) is still caught.
 */
export const carRowSchema = z.custom<CarWithRelations>((v) =>
  isObj(v) &&
  typeof v.id === 'number' &&
  typeof v.brand === 'string' &&
  typeof v.model === 'string' &&
  (v.department == null || isObj(v.department)) &&
  (v.profile == null || isObj(v.profile)) &&
  (v.car_tags == null ||
    (Array.isArray(v.car_tags) &&
      v.car_tags.every((ct) => isObj(ct) && isObj((ct as Record<string, unknown>).tag)))),
)

export const bookingRowSchema = z.custom<BookingWithRelations>((v) =>
  isObj(v) &&
  typeof v.id === 'number' &&
  typeof v.car_id === 'number' &&
  (v.car == null || isObj(v.car)) &&
  (v.renter == null || isObj(v.renter)),
)

export const conversationRowSchema = z.custom<ConversationWithLatest>((v) =>
  isObj(v) &&
  typeof v.id === 'number' &&
  (v.car == null || isObj(v.car)) &&
  (v.renter == null || isObj(v.renter)) &&
  (v.owner == null || isObj(v.owner)) &&
  (v.latest_message == null || Array.isArray(v.latest_message) || isObj(v.latest_message)),
)

export const messageRowSchema = z.custom<MessageWithSender>((v) =>
  isObj(v) &&
  typeof v.id === 'number' &&
  typeof v.sender_id === 'string' &&
  (v.sender == null || isObj(v.sender)),
)

export const reviewRowSchema = z.custom<ReviewWithRelations>((v) =>
  isObj(v) &&
  typeof v.id === 'number' &&
  typeof v.rating === 'number' &&
  (v.renter == null || isObj(v.renter)),
)
