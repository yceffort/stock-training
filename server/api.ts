import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  HttpError,
  account,
  cancelOrder,
  candles,
  ensureSeeded,
  listOrders,
  listStocks,
  placeOrder,
  portfolio,
  resetMarket,
  setSimulator,
  stockDetail,
  tick,
} from './market'
import { closeAllClients, socketStats } from './socket'

type Body = Record<string, unknown>
type Handler = (params: string[], query: URLSearchParams, body: Body) => unknown

interface Route {
  method: string
  pattern: RegExp
  handler: Handler
  status?: number
}

const isE2E = () => process.env.E2E === '1'

const routes: Route[] = [
  { method: 'GET', pattern: /^\/api\/stocks$/, handler: (_, query) => listStocks(query.get('sector')) },
  { method: 'GET', pattern: /^\/api\/stocks\/([^/]+)$/, handler: ([symbol]) => stockDetail(symbol) },
  { method: 'GET', pattern: /^\/api\/stocks\/([^/]+)\/candles$/, handler: ([symbol], query) => candles(symbol, query.get('range') ?? '1d') },
  { method: 'GET', pattern: /^\/api\/account$/, handler: () => account() },
  { method: 'GET', pattern: /^\/api\/portfolio$/, handler: () => portfolio() },
  { method: 'GET', pattern: /^\/api\/orders$/, handler: (_, query) => listOrders(query.get('status'), query.get('cursor')) },
  { method: 'POST', pattern: /^\/api\/orders$/, handler: (_, __, body) => placeOrder(body), status: 201 },
  { method: 'DELETE', pattern: /^\/api\/orders\/([^/]+)$/, handler: ([id]) => cancelOrder(id) },
]

const testRoutes: Route[] = [
  {
    method: 'POST',
    pattern: /^\/api\/test\/reset$/,
    handler: (_, __, body) => {
      resetMarket(typeof body.now === 'string' ? body.now : undefined)
      setSimulator(false)
      return { ok: true }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/test\/simulator$/,
    handler: (_, __, body) => {
      setSimulator(body.running === true, typeof body.intervalMs === 'number' ? body.intervalMs : null)
      return { ok: true }
    },
  },
  { method: 'POST', pattern: /^\/api\/test\/tick$/, handler: (_, __, body) => tick(String(body.symbol), Number(body.price)) },
  {
    method: 'POST',
    pattern: /^\/api\/test\/ws\/drop$/,
    handler: () => {
      closeAllClients()
      return { ok: true }
    },
  },
  { method: 'GET', pattern: /^\/api\/test\/ws\/stats$/, handler: () => socketStats() },
]

function delay() {
  const fixed = Number(process.env.API_DELAY_MS)
  const ms = Number.isFinite(fixed) && process.env.API_DELAY_MS ? fixed : 150 + Math.random() * 650
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readBody(request: IncomingMessage): Promise<Body> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  if (chunks.length === 0) return {}
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(body))
}

export async function handleApi(request: IncomingMessage, response: ServerResponse, next: () => void) {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (!url.pathname.startsWith('/api/')) return next()
  ensureSeeded()

  const isTest = url.pathname.startsWith('/api/test/')
  const candidates = isTest ? (isE2E() ? testRoutes : []) : routes
  for (const route of candidates) {
    const match = url.pathname.match(route.pattern)
    if (!match || route.method !== request.method) continue
    const params = match.slice(1).map(decodeURIComponent)
    const body = request.method === 'POST' ? await readBody(request) : {}
    let status = route.status ?? 200
    let result: unknown
    try {
      result = route.handler(params, url.searchParams, body)
    } catch (error) {
      if (!(error instanceof HttpError)) throw error
      status = error.status
      result = { error: error.message }
    }
    if (!isTest) await delay()
    return send(response, status, result)
  }
  send(response, 404, { error: '요청한 API를 찾을 수 없습니다.' })
}
