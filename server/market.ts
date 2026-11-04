import { CLOSE_MINUTES, OPEN_MINUTES, at, isBusinessDay, isMarketOpen, kstMidnight, kstMinutes, now, recentBusinessDays, setNow } from './clock'
import { createHoldings, createOrders, createStocks, hash, random } from './seed'
import { broadcast, closeAllClients, sendToSubscribers } from './socket'
import { type Order, type StockState, state } from './state'
import { isValidPrice, moveTicks, roundToTick } from './tick-size'

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

const iso = (ms: number) => new Date(ms).toISOString()

export function resetMarket(nowIso?: string) {
  setNow(nowIso)
  const stocks = createStocks()
  const { orders, nextOrderId } = createOrders(stocks, now())
  state.stocks = stocks
  state.orders = orders
  state.nextOrderId = nextOrderId
  state.holdings = createHoldings()
  state.cash = 10_000_000
  state.stats = { subscribeMessages: 0, unsubscribeMessages: 0 }
  state.seeded = true
  closeAllClients()
}

export function ensureSeeded() {
  if (!state.seeded) resetMarket()
}

function quote(stock: StockState) {
  const change = stock.price - stock.prevClose
  return {
    price: String(stock.price),
    change: String(change),
    changeRate: ((change / stock.prevClose) * 100).toFixed(2),
  }
}

function snapshot(stock: StockState) {
  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    ...quote(stock),
    prevClose: String(stock.prevClose),
    volume: String(stock.volume),
    seq: String(stock.seq),
  }
}

export function getStock(symbol: string) {
  const stock = state.stocks.get(symbol)
  if (!stock) throw new HttpError(404, '종목을 찾을 수 없습니다.')
  return stock
}

export function listStocks(sector: string | null) {
  const stocks = [...state.stocks.values()]
  const filtered = stocks.some((stock) => stock.sector === sector) ? stocks.filter((stock) => stock.sector === sector) : stocks
  return filtered.toSorted((a, b) => b.price * b.volume - a.price * a.volume).map(snapshot)
}

export function stockDetail(symbol: string) {
  const stock = getStock(symbol)
  return { ...snapshot(stock), description: stock.description }
}

type CandleRange = '1d' | '1w' | '1m'
const CANDLE_RANGES: string[] = ['1d', '1w', '1m'] satisfies CandleRange[]

function candleTimes(range: CandleRange) {
  const current = now()
  if (range === '1m') {
    return recentBusinessDays(current, 22)
      .map((day) => at(day, 15, 30))
      .reverse()
  }
  if (range === '1w') {
    return recentBusinessDays(current, 5)
      .flatMap((day) => [9, 10, 11, 12, 13, 14, 15].map((hour) => at(day, hour, 0)).reverse())
      .filter((time) => time <= current)
      .reverse()
  }
  const today = kstMidnight(current)
  const sessionDay = isBusinessDay(current) && kstMinutes(current) >= OPEN_MINUTES ? today : recentBusinessDays(today - 1, 1)[0]
  const times: number[] = []
  for (let minute = OPEN_MINUTES; minute <= CLOSE_MINUTES; minute += 10) {
    const time = at(sessionDay, 0, minute)
    if (time <= current) times.push(time)
  }
  return times
}

export function candles(symbol: string, range: string) {
  const stock = getStock(symbol)
  if (!CANDLE_RANGES.includes(range)) throw new HttpError(400, '기간을 확인해 주세요.')
  const times = candleTimes(range as CandleRange)
  const next = random(hash(symbol + range))
  const volatility = range === '1m' ? 0.025 : range === '1w' ? 0.012 : 0.004
  let close = stock.price
  const result = []
  for (let i = times.length - 1; i >= 0; i--) {
    const open = roundToTick(close * (1 + (next() - 0.5) * volatility))
    const high = roundToTick(Math.max(open, close) * (1 + next() * volatility * 0.5))
    const low = roundToTick(Math.min(open, close) * (1 - next() * volatility * 0.5))
    result.push({
      time: iso(times[i]),
      open: String(open),
      high: String(high),
      low: String(low),
      close: String(close),
      volume: String(Math.floor(next() * 50_000) + 1_000),
    })
    close = open
  }
  return result.reverse()
}

function reservedCash() {
  return state.orders
    .filter((order) => order.status === 'open' && order.side === 'buy')
    .reduce((sum, order) => sum + order.price * order.quantity, 0)
}

function reservedQuantity(symbol: string) {
  return state.orders
    .filter((order) => order.status === 'open' && order.side === 'sell' && order.symbol === symbol)
    .reduce((sum, order) => sum + order.quantity, 0)
}

export function account() {
  return { cash: String(state.cash), buyable: String(state.cash - reservedCash()) }
}

export function portfolio() {
  return {
    holdings: [...state.holdings.values()].map((holding) => ({
      symbol: holding.symbol,
      name: getStock(holding.symbol).name,
      quantity: String(holding.quantity),
      avgPrice: String(holding.avgPrice),
    })),
  }
}

function serializeOrder(order: Order) {
  return {
    id: order.id,
    symbol: order.symbol,
    name: getStock(order.symbol).name,
    side: order.side,
    type: order.type,
    price: String(order.price),
    quantity: String(order.quantity),
    status: order.status,
    createdAt: iso(order.createdAt),
    filledAt: order.filledAt === null ? null : iso(order.filledAt),
  }
}

const PAGE_SIZE = 10

export function listOrders(status: string | null, cursor: string | null) {
  const filled = status === 'filled'
  const orders = state.orders
    .filter((order) => order.status === (filled ? 'filled' : 'open'))
    .toSorted((a, b) => (filled ? b.filledAt! - a.filledAt! : b.createdAt - a.createdAt))
  const offset = Number(cursor ?? 0) || 0
  const page = orders.slice(offset, offset + PAGE_SIZE)
  return {
    orders: page.map(serializeOrder),
    nextCursor: offset + PAGE_SIZE < orders.length ? String(offset + PAGE_SIZE) : null,
  }
}

function fill(order: Order, price: number) {
  const time = now()
  order.status = 'filled'
  order.price = price
  order.filledAt = time
  const amount = price * order.quantity
  const holding = state.holdings.get(order.symbol)
  if (order.side === 'buy') {
    state.cash -= amount
    if (holding) {
      const quantity = holding.quantity + order.quantity
      holding.avgPrice = Math.round((holding.avgPrice * holding.quantity + amount) / quantity)
      holding.quantity = quantity
    } else {
      state.holdings.set(order.symbol, { symbol: order.symbol, quantity: order.quantity, avgPrice: price })
    }
  } else {
    state.cash += amount
    holding!.quantity -= order.quantity
    if (holding!.quantity === 0) state.holdings.delete(order.symbol)
  }
  broadcast({
    type: 'fill',
    orderId: order.id,
    symbol: order.symbol,
    side: order.side,
    price: String(price),
    quantity: String(order.quantity),
    ts: iso(time),
  })
}

interface OrderInput {
  symbol?: unknown
  side?: unknown
  type?: unknown
  price?: unknown
  quantity?: unknown
}

export function placeOrder(input: OrderInput) {
  const stock = getStock(String(input.symbol))
  const side = input.side
  const type = input.type
  if (side !== 'buy' && side !== 'sell') throw new HttpError(400, '매수 또는 매도를 선택해 주세요.')
  if (type !== 'market' && type !== 'limit') throw new HttpError(400, '주문 유형을 선택해 주세요.')
  const quantity = Number(input.quantity)
  if (!Number.isInteger(quantity) || quantity < 1) throw new HttpError(400, '수량을 1주 이상 입력해 주세요.')
  const price = type === 'market' ? stock.price : Number(input.price)
  if (type === 'limit' && !isValidPrice(price)) throw new HttpError(400, '호가 단위에 맞지 않는 가격입니다.')
  if (!isMarketOpen(now())) throw new HttpError(400, '장 운영 시간이 아닙니다.')
  if (side === 'buy' && price * quantity > state.cash - reservedCash()) throw new HttpError(400, '주문가능금액이 부족합니다.')
  if (side === 'sell' && quantity > (state.holdings.get(stock.symbol)?.quantity ?? 0) - reservedQuantity(stock.symbol)) {
    throw new HttpError(400, '보유 수량이 부족합니다.')
  }

  const order: Order = {
    id: `o${state.nextOrderId++}`,
    symbol: stock.symbol,
    side,
    type,
    price,
    quantity,
    status: 'open',
    createdAt: now(),
    filledAt: null,
  }
  state.orders.push(order)
  const marketable = type === 'market' || (side === 'buy' ? stock.price <= price : stock.price >= price)
  if (marketable) fill(order, stock.price)
  return serializeOrder(order)
}

export function cancelOrder(id: string) {
  const order = state.orders.find((item) => item.id === id)
  if (!order) throw new HttpError(404, '주문을 찾을 수 없습니다.')
  if (order.status !== 'open') throw new HttpError(400, '미체결 주문만 취소할 수 있습니다.')
  order.status = 'canceled'
  return serializeOrder(order)
}

export function applyPrice(stock: StockState, price: number, volume: number) {
  stock.price = price
  stock.volume += volume
  stock.seq += 1
  sendToSubscribers(stock.symbol, {
    type: 'tick',
    symbol: stock.symbol,
    ...quote(stock),
    volume: String(volume),
    seq: String(stock.seq),
    ts: iso(now()),
  })
  for (const order of state.orders) {
    if (order.status !== 'open' || order.symbol !== stock.symbol) continue
    if (order.side === 'buy' ? price <= order.price : price >= order.price) fill(order, order.price)
  }
}

export function tick(symbol: string, price: number) {
  const stock = getStock(symbol)
  if (!isValidPrice(price)) throw new HttpError(400, '호가 단위에 맞지 않는 가격입니다.')
  applyPrice(stock, price, 1)
  return snapshot(stock)
}

function simulateOnce() {
  const stocks = [...state.stocks.values()]
  const stock = stocks[Math.floor(Math.random() * stocks.length)]
  const ticks = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? -1 : 1)
  // 전일 종가의 ±29% 안에서만 움직인다.
  const nextPrice = moveTicks(stock.price, ticks)
  const bounded = Math.abs(nextPrice - stock.prevClose) > stock.prevClose * 0.29 ? moveTicks(stock.price, -ticks) : nextPrice
  applyPrice(stock, bounded, Math.floor(Math.random() * 500) + 1)
}

export function setSimulator(running: boolean, intervalMs: number | null = null) {
  const simulator = state.simulator
  if (simulator.timer) clearTimeout(simulator.timer)
  simulator.timer = null
  simulator.running = running
  simulator.intervalMs = intervalMs === null ? null : Math.max(5, intervalMs)
  if (!running) return
  const schedule = () => {
    const delay = simulator.intervalMs ?? 300 + Math.random() * 400
    simulator.timer = setTimeout(() => {
      simulateOnce()
      schedule()
    }, delay)
  }
  schedule()
}
