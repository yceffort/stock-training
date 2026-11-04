import { state } from './state'

const KST_OFFSET = 9 * 60 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000

export function now() {
  return Date.now() + state.clockOffset
}

export function setNow(iso?: string) {
  state.clockOffset = iso ? Date.parse(iso) - Date.now() : 0
}

/** KST 기준 자정(epoch ms) */
export function kstMidnight(ms: number) {
  return Math.floor((ms + KST_OFFSET) / DAY) * DAY - KST_OFFSET
}

/** KST 기준 요일(0: 일요일) */
export function kstDay(ms: number) {
  return new Date(ms + KST_OFFSET).getUTCDay()
}

/** KST 자정으로부터 지난 분 */
export function kstMinutes(ms: number) {
  return Math.floor((ms - kstMidnight(ms)) / 60_000)
}

export function at(midnight: number, hour: number, minute: number) {
  return midnight + (hour * 60 + minute) * 60_000
}

export function isBusinessDay(ms: number) {
  const day = kstDay(ms)
  return day !== 0 && day !== 6
}

export const OPEN_MINUTES = 9 * 60
export const CLOSE_MINUTES = 15 * 60 + 30

export function isMarketOpen(ms: number) {
  const minutes = kstMinutes(ms)
  return isBusinessDay(ms) && minutes >= OPEN_MINUTES && minutes < CLOSE_MINUTES
}

/** ms 이전(당일 포함)의 영업일 자정 목록, 최근 날짜부터 */
export function recentBusinessDays(ms: number, count: number) {
  const days: number[] = []
  for (let day = kstMidnight(ms); days.length < count; day -= DAY) {
    if (isBusinessDay(day)) days.push(day)
  }
  return days
}
