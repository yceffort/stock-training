import { Link } from 'react-router-dom'
import { formatNumber, formatPrice, formatSignedPrice, formatSignedRate } from '../lib/format'
import type { Holding } from '../lib/types'

export interface HoldingRow extends Holding {
  price: number
  value: number
  profit: number
  rate: number
}

interface Props {
  holdings: HoldingRow[]
  onTotalChange: (total: number) => void
}

export function HoldingsTable({ holdings, onTotalChange }: Props) {
  const total = holdings.reduce((sum, holding) => sum + holding.value, 0)
  onTotalChange(total)

  return (
    <table aria-label="보유 종목">
      <thead>
        <tr>
          <th>종목명</th>
          <th>수량</th>
          <th>평균단가</th>
          <th>현재가</th>
          <th>평가손익</th>
          <th>수익률</th>
        </tr>
      </thead>
      <tbody>
        {holdings.map((holding) => (
          <tr key={holding.symbol}>
            <td>
              <Link to={`/stocks/${holding.symbol}`}>{holding.name}</Link>
            </td>
            <td className="number">{formatNumber(holding.quantity)}주</td>
            <td className="number">{formatPrice(holding.avgPrice)}</td>
            <td className="number">{formatPrice(holding.price)}</td>
            <td className={`number ${holding.profit >= 0 ? 'up' : 'down'}`}>{formatSignedPrice(holding.profit)}</td>
            <td className={`number ${holding.rate >= 0 ? 'up' : 'down'}`}>{formatSignedRate(holding.rate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
