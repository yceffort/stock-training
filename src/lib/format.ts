const numberFormat = new Intl.NumberFormat('ko-KR')
const rateFormat = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const signedFormat = new Intl.NumberFormat('ko-KR', { signDisplay: 'exceptZero' })
const signedRateFormat = new Intl.NumberFormat('ko-KR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

export function formatNumber(value: number) {
  return numberFormat.format(value)
}

export function formatPrice(value: number) {
  return `${numberFormat.format(value)}원`
}

export function formatSignedPrice(value: number) {
  return `${signedFormat.format(value)}원`
}

export function formatRate(value: number) {
  return `${rateFormat.format(Math.abs(value))}%`
}

export function formatSignedRate(value: number) {
  return `${signedRateFormat.format(value)}%`
}
