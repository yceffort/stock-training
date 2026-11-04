import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { OrderForm } from '../components/OrderForm'
import { PopularStocks } from '../components/PopularStocks'
import { PriceChange } from '../components/PriceChange'
import { RelatedStocks } from '../components/RelatedStocks'
import { StockChart } from '../components/StockChart'
import { StockNotFound } from '../components/StockNotFound'
import { useRealtimePrices } from '../hooks/useRealtimePrices'
import { getStock } from '../lib/api'
import { formatClock } from '../lib/date'
import { formatNumber, formatPrice } from '../lib/format'
import { isMarketOpen } from '../lib/market'
import type { Stock, Tick } from '../lib/types'
import { useMarketStore } from '../store/market'

const SYMBOL_PATTERN = /^\d{6}$/

export function StockDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { selectedSymbol, prices, setPrice } = useMarketStore()
  const symbol = selectedSymbol ?? params.symbol ?? ''

  if (!SYMBOL_PATTERN.test(symbol)) return <StockNotFound />

  const socketRef = useRealtimePrices([symbol])
  const { data: stock, isError } = useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => getStock(symbol),
    // 목록에서 받은 시세로 먼저 그리고, 기업 개요는 응답이 오면 채운다.
    placeholderData: () => {
      const cached = queryClient.getQueryData<Stock[]>(['stocks'])?.find((item) => item.symbol === symbol)
      return cached && { ...cached, description: '' }
    },
  })
  const [trades, setTrades] = useState<Tick[]>([])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    const handleMessage = (event: MessageEvent) => {
      const tick: Tick = JSON.parse(event.data)
      setTrades((prev) => [...prev, tick])
    }
    socket.addEventListener('message', handleMessage)
    return () => socket.removeEventListener('message', handleMessage)
  }, [socketRef])

  useEffect(() => {
    if (stock) setPrice(stock.symbol, stock)
  }, [stock])

  if (isError) return <StockNotFound />

  const quote = prices[symbol] ?? stock
  const recentTrades = trades
    .filter((trade) => trade.symbol === symbol)
    .slice(-20)
    .reverse()

  return (
    <div className="detail">
      <article>
        <button type="button" className="back" onClick={() => navigate(-1)}>
          목록으로
        </button>
        {stock && quote ? (
          <>
            <header className="stock-header">
              <h1>{stock.name}</h1>
              <span className="symbol">{stock.symbol}</span>
              <strong className="current" data-testid="price">
                {formatPrice(quote.price)}
              </strong>
              <PriceChange price={quote.price} prevClose={stock.prevClose} changeRate={quote.changeRate} />
            </header>
            <StockChart symbol={symbol} name={stock.name} />
            <div className="detail-grid">
              <section aria-labelledby="trades-title">
                <h2 id="trades-title">실시간 체결</h2>
                <ul aria-label="실시간 체결" className="trades">
                  {recentTrades.map((trade) => (
                    <li key={trade.seq}>
                      <time>{formatClock(new Date(trade.ts))}</time>
                      <span>{formatPrice(trade.price)}</span>
                      <span>{formatNumber(trade.volume)}주</span>
                    </li>
                  ))}
                </ul>
              </section>
              <OrderForm symbol={symbol} currentPrice={quote.price} marketOpen={isMarketOpen()} />
            </div>
            <section aria-labelledby="overview-title">
              <h2 id="overview-title">기업 개요</h2>
              <p className="overview" dangerouslySetInnerHTML={{ __html: stock.description.replaceAll('\n', '<br>') }} />
            </section>
          </>
        ) : (
          <p>불러오는 중…</p>
        )}
      </article>
      <aside>
        <RelatedStocks symbol={symbol} sector={stock?.sector} />
        <PopularStocks />
      </aside>
    </div>
  )
}
