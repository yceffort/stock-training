import type { Page } from '@playwright/test'
import { expect, formatPrice, getAccount, test } from './helpers'

const group = (page: Page, label: string) => page.getByRole('region', { name: label, exact: true })

test.describe('주문 내역', () => {
  test('미체결과 체결 탭을 URL과 맞춘다', async ({ page }) => {
    await page.goto('/orders')
    await expect(page.getByRole('tab', { name: '미체결', exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('listitem').filter({ hasText: '새빛칩스' })).toBeVisible()

    await page.getByRole('tab', { name: '체결', exact: true }).click()
    await expect(page).toHaveURL(/status=filled/)
    await expect(page.getByRole('tab', { name: '체결', exact: true })).toHaveAttribute('aria-selected', 'true')

    await page.goto('/orders?status=filled')
    await expect(page.getByRole('tab', { name: '체결', exact: true })).toHaveAttribute('aria-selected', 'true')
  })

  test('체결 내역을 날짜별로 묶어서 보여 준다', async ({ page }) => {
    await page.goto('/orders?status=filled')

    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['오늘', '어제', '10월 30일 (금)'])
    await expect(group(page, '오늘').getByRole('listitem').filter({ hasText: '09:03' })).toBeVisible()
    await expect(group(page, '어제').getByRole('listitem').last()).toContainText('09:30')
  })

  test('미체결 주문은 접수 후 지난 시간을 보여 준다', async ({ page }) => {
    await page.goto('/orders')

    await expect(page.getByRole('listitem').filter({ hasText: '새빛칩스' })).toContainText('3분 전')
    await expect(page.getByRole('listitem').filter({ hasText: '다온세미콘' })).toContainText('25분 전')
  })

  test('체결 주문은 결제일을 보여 준다', async ({ page }) => {
    await page.goto('/orders?status=filled')

    await expect(group(page, '오늘').getByRole('listitem').filter({ hasText: '09:03' })).toContainText('결제일 11월 5일 (목)')
    await expect(group(page, '어제').getByRole('listitem').last()).toContainText('결제일 11월 4일 (수)')
  })

  test('더 보기로 다음 주문을 이어서 불러온다', async ({ page, request }) => {
    let total = 0
    for (let cursor: string | null = '0'; cursor !== null; ) {
      const pageData: { orders: unknown[]; nextCursor: string | null } = await (await request.get(`/api/orders?status=filled&cursor=${cursor}`)).json()
      total += pageData.orders.length
      cursor = pageData.nextCursor
    }
    await page.goto('/orders?status=filled')
    const items = page.locator('main').getByRole('listitem')
    await expect(items).toHaveCount(10)

    await page.getByRole('button', { name: '더 보기' }).click()
    await expect(items).toHaveCount(20)
    while (await page.getByRole('button', { name: '더 보기' }).isVisible()) {
      const count = await items.count()
      await page.getByRole('button', { name: '더 보기' }).click()
      await expect(items).not.toHaveCount(count)
    }
    await expect(items).toHaveCount(total)
    await expect(page.getByRole('button', { name: '더 보기' })).toBeHidden()
  })

  test('미체결 주문을 취소한다', async ({ page, request }) => {
    const before = await getAccount(request)
    await page.goto('/orders')
    const row = page.getByRole('listitem').filter({ hasText: '새빛칩스' })

    await row.getByRole('button', { name: '취소' }).click()
    await expect(row).toBeHidden()
    await expect(page.getByTestId('buyable-cash')).toHaveText(formatPrice(Number(before.buyable) + 150_000 * 2))
  })
})
