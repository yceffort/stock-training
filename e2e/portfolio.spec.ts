import type { Page } from '@playwright/test'
import { expect, placeOrder, sendTick, test, waitForSubscribers } from './helpers'

const holdingRow = (page: Page, name: string) => page.getByRole('table', { name: '보유 종목' }).getByRole('row').filter({ hasText: name })

test.describe('잔고', () => {
  test('보유 종목과 평가 금액을 보여 준다', async ({ page }) => {
    await page.goto('/portfolio')

    await expect(page.getByRole('heading', { level: 1, name: '잔고' })).toBeVisible()
    await expect(page.getByTestId('cash')).toHaveText('10,000,000원')
    const row = holdingRow(page, '한결반도체')
    await expect(row.getByRole('cell')).toHaveText(['한결반도체', '20주', '68,500원', '71,200원', '+54,000원', '+3.94%'])
    await expect(holdingRow(page, '구름소프트').getByRole('cell')).toHaveText(['구름소프트', '3주', '230,000원', '218,500원', '-34,500원', '-5.00%'])
    // 1,424,000 + 730,500 + 655,500
    await expect(page.getByTestId('total-value')).toHaveText('2,810,000원')
    await expect(page.getByTestId('total-profit')).toHaveText('+118,500원')
  })

  test('실시간 시세로 평가 금액을 다시 계산한다', async ({ page, request }) => {
    await page.goto('/portfolio')
    await expect(page.getByTestId('total-value')).toHaveText('2,810,000원')
    await waitForSubscribers(request, 3)

    await sendTick(request, '710010', 72_000)
    await expect(holdingRow(page, '한결반도체').getByRole('cell')).toHaveText(['한결반도체', '20주', '68,500원', '72,000원', '+70,000원', '+5.11%'])
    await expect(page.getByTestId('total-value')).toHaveText('2,826,000원')
    await expect(page.getByTestId('total-profit')).toHaveText('+134,500원')
  })

  test('보유 종목이 없으면 안내를 보여 준다', async ({ page, request }) => {
    for (const [symbol, quantity] of [
      ['710010', 20],
      ['730010', 150],
      ['740010', 3],
    ] as const) {
      await placeOrder(request, { symbol, side: 'sell', type: 'market', quantity })
    }
    await page.goto('/portfolio')

    await expect(page.getByText('보유 종목이 없습니다.')).toBeVisible()
    await expect(page.getByTestId('total-value')).toHaveText('0원')
  })
})
