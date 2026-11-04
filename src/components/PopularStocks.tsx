import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getStocks } from '../lib/api'

export function PopularStocks() {
  // 인기 순위는 자주 바뀌지 않으므로 5분 동안 다시 받지 않는다.
  const { data: stocks } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => getStocks(),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <section aria-labelledby="popular-title" className="side-section">
      <h2 id="popular-title">인기 종목</h2>
      {stocks ? (
        <ol>
          {stocks.slice(0, 5).map((stock) => (
            <li key={stock.symbol}>
              <Link to={`/stocks/${stock.symbol}`}>{stock.name}</Link>
            </li>
          ))}
        </ol>
      ) : (
        <p>불러오는 중…</p>
      )}
    </section>
  )
}
