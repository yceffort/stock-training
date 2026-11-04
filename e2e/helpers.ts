import { type APIRequestContext, expect, test as base } from '@playwright/test'

// 화요일 오전 10시(KST). 모든 테스트는 이 시각에서 시작한다.
export const NOW = '2026-11-03T10:00:00+09:00'

export const test = base.extend<{ now: string }>({
  now: [NOW, { option: true }],
  page: async ({ page, request, now }, use) => {
    await request.post('/api/test/reset', { data: { now } })
    await page.clock.install({ time: new Date(now) })
    await use(page)
  },
})

export { expect }

export interface StockSnapshot {
  symbol: string
  name: string
  sector: string
  price: string
  prevClose: string
}

export function formatPrice(value: number | string) {
  return `${Number(value).toLocaleString('ko-KR')}원`
}

export async function listStocks(request: APIRequestContext, sector?: string): Promise<StockSnapshot[]> {
  return (await request.get(sector ? `/api/stocks?sector=${sector}` : '/api/stocks')).json()
}

export async function getAccount(request: APIRequestContext): Promise<{ cash: string; buyable: string }> {
  return (await request.get('/api/account')).json()
}

export async function sendTick(request: APIRequestContext, symbol: string, price: number) {
  const response = await request.post('/api/test/tick', { data: { symbol, price } })
  expect(response.ok()).toBe(true)
}

/** 화면이 해당 종목을 구독할 때까지 기다린다. 구독 전에 보낸 틱은 화면에 도착하지 않는다. */
export async function waitForSubscribers(request: APIRequestContext, minimumSymbols: number) {
  await expect
    .poll(async () => {
      const stats = await (await request.get('/api/test/ws/stats')).json()
      return Math.max(0, ...stats.subscriptions)
    })
    .toBeGreaterThanOrEqual(minimumSymbols)
}

export async function placeOrder(request: APIRequestContext, order: Record<string, unknown>) {
  const response = await request.post('/api/orders', { data: order })
  expect(response.ok()).toBe(true)
  return response.json()
}
