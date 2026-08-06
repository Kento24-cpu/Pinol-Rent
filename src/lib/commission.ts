// Comisiones de la plataforma.
// Estas fórmulas deben coincidir EXACTAMENTE con el trigger
// `check_and_init_booking` de la DB (migración 20240024000000_commissions.sql).
// La DB es la fuente de verdad: los detalles de reserva deben mostrar los
// valores persistidos (renter_service_fee, owner_commission, owner_net_total).

export const OWNER_COMMISSION = 0.05
export const RENTER_FEE = 0.07

export function ownerNetPrice(basePrice: number): number {
  return Math.round(basePrice * (1 - OWNER_COMMISSION))
}

export function ownerCommissionAmount(basePrice: number, days = 1): number {
  return Math.round(basePrice * OWNER_COMMISSION) * days
}

export function renterUnitPrice(basePrice: number): number {
  return Math.round(basePrice * (1 + RENTER_FEE))
}

export function renterFeeAmount(basePrice: number, days = 1): number {
  return renterTotalPrice(basePrice, days) - basePrice * days
}

export function renterTotalPrice(basePricePerDay: number, days: number): number {
  return renterUnitPrice(basePricePerDay) * days
}
