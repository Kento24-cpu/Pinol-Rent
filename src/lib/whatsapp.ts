export function waMeUrl(phone: string, message: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.length === 8) digits = `505${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}