import { formatRate } from '../lib/format'

interface Props {
  price: number
  prevClose: number
  changeRate: number
}

export function PriceChange({ price, prevClose, changeRate }: Props) {
  const direction = price > prevClose ? 'up' : price < prevClose ? 'down' : 'flat'
  const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : ''

  return (
    <span className={`change ${direction}`}>
      {arrow} {formatRate(changeRate)}
    </span>
  )
}
