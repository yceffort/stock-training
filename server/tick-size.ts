// KRX 호가 가격 단위(2023년 개편)
export function tickSize(price: number) {
  if (price < 2_000) return 1
  if (price < 5_000) return 5
  if (price < 20_000) return 10
  if (price < 50_000) return 50
  if (price < 200_000) return 100
  if (price < 500_000) return 500
  return 1_000
}

export function isValidPrice(price: number) {
  return Number.isInteger(price) && price > 0 && price % tickSize(price) === 0
}

export function roundToTick(price: number) {
  const unit = tickSize(price)
  return Math.max(unit, Math.round(price / unit) * unit)
}

export function moveTicks(price: number, ticks: number) {
  let next = price
  for (let i = 0; i < Math.abs(ticks); i++) {
    next = ticks > 0 ? next + tickSize(next) : next - tickSize(next - 1)
  }
  return next
}
