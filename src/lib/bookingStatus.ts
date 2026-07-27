export const STATUS_COLORS: Record<string, string> = {
  pending: '#F9A825',
  pending_payment: '#E65100',
  confirmed: '#2E7D32',
  cancelled: '#C62828',
  completed: '#1565C0',
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  pending_payment: 'Pendiente de pago',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
}

export function getStatusColor(status: string, fallback: string): string {
  return STATUS_COLORS[status] ?? fallback
}

export function getStatusLabel(status: string, fallback?: string): string {
  return STATUS_LABELS[status] ?? fallback ?? status
}
