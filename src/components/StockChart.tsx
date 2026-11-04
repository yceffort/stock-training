import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getCandles } from '../lib/api'
import type { ChartRange } from '../lib/types'

const RANGES: { value: ChartRange; label: string }[] = [
  { value: '1d', label: '1일' },
  { value: '1w', label: '1주' },
  { value: '1m', label: '1개월' },
]

const WIDTH = 600
const HEIGHT = 200

interface Props {
  symbol: string
  name: string
}

export function StockChart({ symbol, name }: Props) {
  const [range, setRange] = useState<ChartRange>('1d')
  const { data: candles } = useQuery({
    queryKey: ['candles', symbol, range],
    queryFn: () => getCandles(symbol, range),
    placeholderData: keepPreviousData,
  })

  const closes = candles?.map((candle) => candle.close) ?? []
  const max = Math.max(...closes)
  const min = Math.min(...closes)
  const points = closes
    .map((close, index) => {
      const x = closes.length > 1 ? (index / (closes.length - 1)) * WIDTH : WIDTH / 2
      const y = HEIGHT - ((close - min) / (max - min || 1)) * HEIGHT
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <section className="chart">
      <div role="tablist" aria-label="차트 기간">
        {RANGES.map((item) => (
          <button key={item.value} type="button" role="tab" aria-selected={range === item.value} onClick={() => setRange(item.value)}>
            {item.label}
          </button>
        ))}
      </div>
      <svg role="img" aria-label={`${name} 차트`} viewBox={`-4 -4 ${WIDTH + 8} ${HEIGHT + 8}`}>
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </section>
  )
}
