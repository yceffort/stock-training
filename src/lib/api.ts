import type { Account, Candle, ChartRange, Holding, Order, OrderPage, OrderRequest, OrderStatus, Stock, StockDetail } from './types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? '요청을 처리하지 못했습니다.')
  return body as T
}

export function getStocks(sector?: string) {
  return request<Stock[]>(sector ? `/api/stocks?sector=${sector}` : '/api/stocks')
}

export function getStock(symbol: string) {
  return request<StockDetail>(`/api/stocks/${symbol}`)
}

export function getCandles(symbol: string, range: ChartRange) {
  return request<Candle[]>(`/api/stocks/${symbol}/candles?range=${range}`)
}

export function getAccount() {
  return request<Account>('/api/account')
}

export function getPortfolio() {
  return request<{ holdings: Holding[] }>('/api/portfolio')
}

export function getOrders(status: OrderStatus, cursor?: string) {
  const params = new URLSearchParams({ status })
  if (cursor) params.set('cursor', cursor)
  return request<OrderPage>(`/api/orders?${params}`)
}

export function placeOrder(order: OrderRequest) {
  return request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(order) })
}

export function cancelOrder(id: string) {
  return request<Order>(`/api/orders/${id}`, { method: 'DELETE' })
}
