import type { WebSocket } from 'ws'

export type Sector = 'semiconductor' | 'auto' | 'bio' | 'internet' | 'finance' | 'chemical'

export interface StockState {
  symbol: string
  name: string
  sector: Sector
  description: string
  prevClose: number
  price: number
  volume: number
  seq: number
}

export interface Order {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  price: number
  quantity: number
  status: 'open' | 'filled' | 'canceled'
  createdAt: number
  filledAt: number | null
}

export interface Holding {
  symbol: string
  quantity: number
  avgPrice: number
}

export interface Client {
  socket: WebSocket
  symbols: Set<string>
}

interface ServerState {
  clockOffset: number
  stocks: Map<string, StockState>
  orders: Order[]
  holdings: Map<string, Holding>
  cash: number
  nextOrderId: number
  clients: Set<Client>
  stats: { subscribeMessages: number; unsubscribeMessages: number }
  simulator: { running: boolean; intervalMs: number | null; timer: ReturnType<typeof setTimeout> | null }
  heartbeat: ReturnType<typeof setInterval> | null
  seeded: boolean
}

const globalState = globalThis as typeof globalThis & { __stockTrainingServer?: ServerState }

// Vite가 설정을 다시 읽어 플러그인이 새로 로드되어도 데이터와 연결을 유지한다.
export const state: ServerState = (globalState.__stockTrainingServer ??= {
  clockOffset: 0,
  stocks: new Map(),
  orders: [],
  holdings: new Map(),
  cash: 0,
  nextOrderId: 1,
  clients: new Set(),
  stats: { subscribeMessages: 0, unsubscribeMessages: 0 },
  simulator: { running: false, intervalMs: null, timer: null },
  heartbeat: null,
  seeded: false,
})
