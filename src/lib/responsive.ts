import { useWindowDimensions } from 'react-native'

export const CARD_RADIUS = 16
export const CARD_MAX_WIDTH = 520
export const LIST_MAX_WIDTH = 630
export const DETAIL_MAX_WIDTH = 720

export function useGridColumns(): number {
  const { width } = useWindowDimensions()
  if (width >= 1200) return 3
  if (width >= 768) return 2
  return 1
}
