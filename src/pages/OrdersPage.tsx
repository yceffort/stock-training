import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useId } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cancelOrder, getOrders } from '../lib/api'
import { formatElapsed, formatGroupDate, formatSettlementDate, formatTime } from '../lib/date'
import { formatNumber, formatPrice } from '../lib/format'
import type { Order, OrderStatus } from '../lib/types'

function groupByDate(orders: Order[]) {
  const groups = new Map<string, Order[]>()
  for (const order of orders) {
    const label = formatGroupDate(new Date(order.filledAt ?? order.createdAt))
    groups.set(label, [...(groups.get(label) ?? []), order])
  }
  return [...groups]
}

interface GroupProps {
  label: string
  orders: Order[]
  onCancel: (id: string) => void
  canceling: boolean
}

function OrderGroup({ label, orders, onCancel, canceling }: GroupProps) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="order-group">
      <h2 id={titleId}>{label}</h2>
      <ul>
        {orders.map((order) => {
          const date = new Date(order.filledAt ?? order.createdAt)
          return (
            <li key={order.id} className="order">
              <time>{formatTime(date)}</time>
              <span className="name">{order.name}</span>
              <span className={order.side}>{order.side === 'buy' ? '매수' : '매도'}</span>
              <span className="number">{formatPrice(order.price)}</span>
              <span className="number">{formatNumber(order.quantity)}주</span>
              {order.status === 'open' ? (
                <>
                  <span className="muted">{formatElapsed(new Date(order.createdAt))}</span>
                  <button type="button" disabled={canceling} onClick={() => onCancel(order.id)}>
                    취소
                  </button>
                </>
              ) : (
                <span className="muted">결제일 {formatSettlementDate(date)}</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function OrdersPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const status: OrderStatus = searchParams.get('status') === 'filled' ? 'filled' : 'open'

  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['orders', status],
    queryFn: ({ pageParam }) => getOrders(status, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const cancel = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['account'] })
    },
  })

  return (
    <>
      <h1>주문 내역</h1>
      <div role="tablist" aria-label="주문 상태" className="tabs">
        <button type="button" role="tab" aria-selected={status === 'open'} onClick={() => setSearchParams({ status: 'open' })}>
          미체결
        </button>
        <button type="button" role="tab" aria-selected={status === 'filled'} onClick={() => setSearchParams({ status: 'filled' })}>
          체결
        </button>
      </div>
      {!data ? (
        <p>불러오는 중…</p>
      ) : data.pages[0].orders.length === 0 ? (
        <p className="empty">주문 내역이 없습니다.</p>
      ) : (
        data.pages.map((page, index) => (
          <div key={index}>
            {groupByDate(page.orders).map(([label, orders]) => (
              <OrderGroup key={label} label={label} orders={orders} onCancel={cancel.mutate} canceling={cancel.isPending} />
            ))}
          </div>
        ))
      )}
      {hasNextPage && (
        <button type="button" className="more" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
          더 보기
        </button>
      )}
    </>
  )
}
