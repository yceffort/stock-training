import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useRealtimePrices } from '../hooks/useRealtimePrices'
import { getAccount, getStocks } from '../lib/api'
import { formatNumber, formatPrice } from '../lib/format'
import { isMarketOpen } from '../lib/market'
import type { Fill } from '../lib/types'
import { type ConnectionStatus, useMarketStore } from '../store/market'

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: '연결 중',
  open: '실시간',
  closed: '연결 끊김',
}

function FillToast({ fill }: { fill: Fill }) {
  const { data: stocks } = useQuery({ queryKey: ['stocks'], queryFn: () => getStocks() })
  const name = stocks?.find((stock) => stock.symbol === fill.symbol)?.name ?? fill.symbol

  return (
    <div role="status" className="toast">
      {name} {formatNumber(fill.quantity)}주 {fill.side === 'buy' ? '매수' : '매도'} 체결
    </div>
  )
}

export function Header() {
  const queryClient = useQueryClient()
  const socketRef = useRealtimePrices([])
  const { connectionStatus } = useMarketStore()
  const { data: account } = useQuery({ queryKey: ['account'], queryFn: getAccount })
  const [fills, setFills] = useState<Fill[]>([])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data)
      if (message.type !== 'fill') return
      setFills([...fills, message])
      setTimeout(() => setFills(fills.filter((fill) => fill.orderId !== message.orderId)), 5000)
      queryClient.invalidateQueries({ queryKey: ['account'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    }
    socket.addEventListener('message', handleMessage)
    return () => socket.removeEventListener('message', handleMessage)
  }, [])

  return (
    <header className="app-header">
      <Link to="/" className="logo">
        모의투자
      </Link>
      <nav aria-label="주요 메뉴">
        <NavLink to="/" end>
          시세
        </NavLink>
        <NavLink to="/orders">주문 내역</NavLink>
        <NavLink to="/portfolio">잔고</NavLink>
      </nav>
      <div className="header-status">
        <span data-testid="market-status">{isMarketOpen() ? '장중' : '장마감'}</span>
        <span data-testid="connection-status" className={`connection ${connectionStatus}`}>
          {STATUS_LABEL[connectionStatus]}
        </span>
        <span>
          주문가능 <strong data-testid="buyable-cash">{account ? formatPrice(account.buyable) : '-'}</strong>
        </span>
      </div>
      <div className="toasts">
        {fills.map((fill) => (
          <FillToast key={fill.orderId} fill={fill} />
        ))}
      </div>
    </header>
  )
}
