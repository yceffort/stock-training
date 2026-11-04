import { expect, formatPrice, getAccount, test } from './helpers'

test.describe('헤더', () => {
  test('주요 메뉴로 각 화면에 이동한다', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: '주요 메뉴' })

    await nav.getByRole('link', { name: '주문 내역' }).click()
    await expect(page.getByRole('heading', { level: 1, name: '주문 내역' })).toBeVisible()
    await nav.getByRole('link', { name: '잔고' }).click()
    await expect(page.getByRole('heading', { level: 1, name: '잔고' })).toBeVisible()
    await nav.getByRole('link', { name: '시세' }).click()
    await expect(page.getByRole('heading', { level: 1, name: '시세' })).toBeVisible()
    await page.getByRole('link', { name: '모의투자' }).click()
    await expect(page).toHaveURL('/')
  })

  test('장 상태, 연결 상태, 주문가능금액을 보여 준다', async ({ page, request }) => {
    const account = await getAccount(request)
    await page.goto('/orders')

    await expect(page.getByTestId('market-status')).toHaveText('장중')
    await expect(page.getByTestId('connection-status')).toHaveText('실시간')
    await expect(page.getByTestId('buyable-cash')).toHaveText(formatPrice(account.buyable))
  })

  test.describe('장 운영 시간이 끝난 뒤', () => {
    test.use({ now: '2026-11-03T16:00:00+09:00' })

    test('장마감으로 표시한다', async ({ page }) => {
      await page.goto('/orders')
      await expect(page.getByTestId('market-status')).toHaveText('장마감')
    })
  })
})
