import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { StockRow } from '../components/StockRow'
import { useRealtimePrices } from '../hooks/useRealtimePrices'
import { getStocks } from '../lib/api'
import { SECTORS } from '../lib/market'
import type { Stock } from '../lib/types'
import { useMarketStore } from '../store/market'

const sortSchema = z.enum(['name', 'price-desc', 'rate-desc', 'rate-asc'])
type SortKey = z.infer<typeof sortSchema>

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name', label: '이름순' },
  { value: 'price-desc', label: '현재가 높은순' },
  { value: 'rate-desc', label: '등락률 높은순' },
  { value: 'rate-asc', label: '등락률 낮은순' },
]

const compare: Record<SortKey, (a: Stock, b: Stock) => number> = {
  name: (a, b) => a.name.localeCompare(b.name, 'ko'),
  'price-desc': (a, b) => b.price - a.price,
  'rate-desc': (a, b) => b.changeRate - a.changeRate,
  'rate-asc': (a, b) => a.changeRate - b.changeRate,
}

export function StockListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const sector = searchParams.get('sector') ?? ''
  const sort = sortSchema.parse(searchParams.get('sort') ?? 'name')
  const watchOnly = searchParams.get('watch') === '1'
  const { prices, watchlist } = useMarketStore()

  const { data: stocks } = useQuery({
    queryKey: sector ? ['stocks', { sector }] : ['stocks'],
    queryFn: () => getStocks(sector || undefined),
    initialData: [],
  })

  const keyword = q.trim()
  const visibleStocks = stocks
    .sort(compare[sort])
    .filter((stock) => stock.name.includes(keyword) || stock.symbol.includes(keyword))
    .filter((stock) => !watchOnly || watchlist.includes(stock.symbol))

  useRealtimePrices(visibleStocks.map((stock) => stock.symbol))

  return (
    <>
      <h1>시세</h1>
      <div className="filters">
        <form role="search">
          <input
            type="search"
            name="q"
            aria-label="종목 검색"
            placeholder="종목명 또는 코드"
            value={q}
            onChange={(event) =>
              setSearchParams(
                (prev) => {
                  prev.set('q', event.target.value)
                  return prev
                },
                { replace: true },
              )
            }
          />
        </form>
        <select aria-label="업종" value={sector} onChange={(event) => setSearchParams({ sector: event.target.value })}>
          <option value="">전체</option>
          {SECTORS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select aria-label="정렬" value={sort} onChange={(event) => setSearchParams({ sort: event.target.value })}>
          {SORT_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={watchOnly}
            onChange={(event) =>
              setSearchParams((prev) => {
                if (event.target.checked) prev.set('watch', '1')
                else prev.delete('watch')
                return prev
              })
            }
          />
          관심종목만
        </label>
      </div>
      {visibleStocks.length === 0 ? (
        <p className="empty">조건에 맞는 종목이 없습니다.</p>
      ) : (
        <table aria-label="종목 시세" className="quotes">
          <thead>
            <tr>
              <th>종목명</th>
              <th>현재가</th>
              <th>등락률</th>
              <th>관심</th>
              <th>빠른 매수</th>
            </tr>
          </thead>
          <tbody>
            {visibleStocks.map((stock) => {
              const quote = prices[stock.symbol] ?? stock
              return <StockRow key={`${stock.symbol}-${quote.price}`} stock={stock} quote={quote} />
            })}
          </tbody>
        </table>
      )}
    </>
  )
}
