import { useWindowDimensions } from 'react-native'
import { breakpoints } from '../lib/theme'

export function useResponsive() {
  const { width } = useWindowDimensions()
  const isTablet = width >= breakpoints.tablet
  const isDesktop = width >= breakpoints.desktop
  const columns = isDesktop ? 3 : isTablet ? 2 : 1
  return { width, isTablet, isDesktop, columns }
}
