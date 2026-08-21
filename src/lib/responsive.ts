import { useWindowDimensions } from 'react-native'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

export const BREAKPOINTS = {
  tablet: 640,
  desktop: 1024,
} as const

export const SIDEBAR_WIDTH = 280
export const CONTENT_MAX = 1200
export const DETAIL_MAX = 900
export const CARD_MAX_WIDTH = 520
export const LIST_MAX_WIDTH = 630
export const DETAIL_MAX_WIDTH = 720

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions()
  if (width >= BREAKPOINTS.desktop) return 'desktop'
  if (width >= BREAKPOINTS.tablet) return 'tablet'
  return 'mobile'
}

interface ColumnOptions {
  mobile?: number
  tablet?: number
  desktop?: number
}

export function useColumns(opts: ColumnOptions = {}): number {
  const bp = useBreakpoint()
  if (bp === 'desktop') return opts.desktop ?? 3
  if (bp === 'tablet') return opts.tablet ?? 2
  return opts.mobile ?? 1
}

export function isDesktopWidth(width: number): boolean {
  return width >= BREAKPOINTS.desktop
}
