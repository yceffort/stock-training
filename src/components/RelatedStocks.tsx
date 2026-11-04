import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getStocks } from '../lib/api'
import type { Sector } from '../lib/types'

interface Props {
  symbol: string
  sector?: Sector
}

export function RelatedStocks({ symbol, sector }: Props) {
  const { data: stocks } = useQuery({
    queryKey: ['stocks', { sector }],
    queryFn: () => getStocks(sector),
  })
  const related = stocks?.filter((stock) => stock.symbol !== symbol).slice(0, 5)

  return (
    <section aria-labelledby="related-title" className="side-section">
      <h2 id="related-title">같은 업종</h2>
      {related ? (
        <ul>
          {related.map((stock) => (
            <li key={stock.symbol}>
              <Link to={`/stocks/${stock.symbol}`}>{stock.name}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>불러오는 중…</p>
      )}
    </section>
  )
}
