import { getDay, getHours, getMinutes } from 'date-fns'
import type { Sector } from './types'

export const SECTORS: { value: Sector; label: string }[] = [
  { value: 'semiconductor', label: '반도체' },
  { value: 'auto', label: '자동차' },
  { value: 'bio', label: '바이오' },
  { value: 'internet', label: '인터넷' },
  { value: 'finance', label: '금융' },
  { value: 'chemical', label: '화학' },
]

export function isMarketOpen(date = new Date()) {
  const day = getDay(date)
  if (day === 0 || day === 6) return false
  const minutes = getHours(date) * 60 + getMinutes(date)
  return minutes >= 9 * 60 && minutes < 15 * 60 + 30
}

// 호가 가격 단위
export function tickSize(price: number) {
  if (price < 2_000) return 1
  if (price < 5_000) return 5
  if (price < 20_000) return 10
  if (price < 50_000) return 50
  if (price < 200_000) return 100
  if (price < 500_000) return 500
  return 1_000
}

export function nextPrice(price: number) {
  return price + tickSize(price)
}

export function prevPrice(price: number) {
  return price - tickSize(price - 1)
}
