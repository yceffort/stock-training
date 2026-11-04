import { addDays, differenceInDays, format, formatDistanceToNow } from 'date-fns'
import * as locales from 'date-fns/locale'

const locale = locales[document.documentElement.lang as keyof typeof locales] ?? locales.ko

export function formatGroupDate(date: Date, now = new Date()) {
  const days = differenceInDays(now, date)
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  return format(date, 'M월 d일 (EEE)', { locale })
}

export function formatTime(date: Date) {
  return format(date, 'HH:mm')
}

export function formatClock(date: Date) {
  return format(date, 'HH:mm:ss')
}

export function formatElapsed(date: Date) {
  return formatDistanceToNow(date, { addSuffix: true, locale })
}

export function formatSettlementDate(filledAt: Date) {
  return format(addDays(filledAt, 2), 'M월 d일 (EEE)', { locale })
}
