export type Sector = 'semiconductor' | 'auto' | 'bio' | 'internet' | 'finance' | 'chemical'

export interface Quote {
  price: number
  change: number
  changeRate: number
  seq: number
}

export interface Stock extends Quote {
  symbol: string
  name: string
  sector: Sector
  prevClose: number
  volume: number
}

export interface StockDetail extends Stock {
  description: string
}

export interface Tick extends Quote {
  type: 'tick'
  symbol: string
  volume: number
  ts: string
}

export interface Fill {
  type: 'fill'
  orderId: string
  symbol: string
  side: OrderSide
  price: number
  quantity: number
  ts: string
}

export type ChartRange = '1d' | '1w' | '1m'

export interface Candle {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Account {
  cash: number
  buyable: number
}

export interface Holding {
  symbol: string
  name: string
  quantity: number
  avgPrice: number
}

export type OrderSide = 'buy' | 'sell'
export type OrderType = 'market' | 'limit'
export type OrderStatus = 'open' | 'filled'

export interface Order {
  id: string
  symbol: string
  name: string
  side: OrderSide
  type: OrderType
  price: number
  quantity: number
  status: OrderStatus | 'canceled'
  createdAt: string
  filledAt: string | null
}

export interface OrderPage {
  orders: Order[]
  nextCursor: string | null
}

export interface OrderRequest {
  symbol: string
  side: OrderSide
  type: OrderType
  price?: number
  quantity: number
}
