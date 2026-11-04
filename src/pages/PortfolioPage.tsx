import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { type HoldingRow, HoldingsTable } from '../components/HoldingsTable'
import { useRealtimePrices } from '../hooks/useRealtimePrices'
import { getAccount, getPortfolio, getStocks } from '../lib/api'
import { formatPrice, formatSignedPrice } from '../lib/format'
import { useMarketStore } from '../store/market'

export function PortfolioPage() {
  const queryClient = useQueryClient()
  const { prices } = useMarketStore()
  const { data: account } = useQuery({ queryKey: ['account'], queryFn: getAccount })
  const { data: portfolio, dataUpdatedAt } = useQuery({ queryKey: ['portfolio'], queryFn: getPortfolio })
  const { data: stocks } = useQuery({ queryKey: ['stocks'], queryFn: () => getStocks() })
  const [holdings, setHoldings] = useState<HoldingRow[] | null>(null)
  const [totalValue, setTotalValue] = useState(0)

  const socketRef = useRealtimePrices(portfolio?.holdings.map((holding) => holding.symbol) ?? [])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    socket.addEventListener('message', refresh)
    return () => socket.removeEventListener('message', refresh)
  }, [socketRef, queryClient])

  useEffect(() => {
    if (!portfolio || !stocks) return
    setHoldings(
      portfolio.holdings.map((holding) => {
        const price = prices[holding.symbol]?.price ?? stocks.find((stock) => stock.symbol === holding.symbol)!.price
        const value = price * holding.quantity
        const cost = holding.avgPrice * holding.quantity
        return { ...holding, price, value, profit: value - cost, rate: ((value - cost) / cost) * 100 }
      }),
    )
  }, [portfolio, stocks, dataUpdatedAt])

  const totalCost = holdings?.reduce((sum, holding) => sum + holding.avgPrice * holding.quantity, 0) ?? 0

  return (
    <>
      <h1>잔고</h1>
      <dl className="summary">
        <div>
          <dt>예수금</dt>
          <dd data-testid="cash">{account ? formatPrice(account.cash) : '-'}</dd>
        </div>
        <div>
          <dt>총 평가금액</dt>
          <dd data-testid="total-value">{formatPrice(totalValue)}</dd>
        </div>
        <div>
          <dt>총 평가손익</dt>
          <dd data-testid="total-profit">{formatSignedPrice(totalValue - totalCost)}</dd>
        </div>
      </dl>
      {holdings ? (
        <>
          {holdings.length === 0 && <p className="empty">보유 종목이 없습니다.</p>}
          {holdings.length && <HoldingsTable holdings={holdings} onTotalChange={setTotalValue} />}
        </>
      ) : (
        <p>불러오는 중…</p>
      )}
    </>
  )
}
