import { expect, formatPrice, listStocks, sendTick, test, waitForSubscribers } from './helpers'

const orderForm = (page: import('@playwright/test').Page) => page.getByRole('form', { name: '주문' })

test.describe('종목 상세', () => {
  test('종목 정보와 기업 개요를 보여 준다', async ({ page }) => {
    await page.goto('/stocks/710010')

    await expect(page.getByRole('heading', { level: 1, name: '한결반도체' })).toBeVisible()
    await expect(page.getByText('710010', { exact: true })).toBeVisible()
    await expect(page.getByTestId('price')).toHaveText('71,200원')
    await expect(page.getByText('▲ 0.56%')).toBeVisible()

    const overview = page.getByRole('region', { name: '기업 개요' })
    await expect(overview).toContainText('메모리 반도체를 설계하고 생산하는 종합 반도체 기업입니다.')
    const text = await overview.locator('p').innerText()
    expect(text.split('\n')).toEqual([
      '메모리 반도체를 설계하고 생산하는 종합 반도체 기업입니다.',
      '서버용 고대역폭 메모리 매출 비중이 꾸준히 늘고 있습니다.',
      '국내외에 생산 공장 네 곳을 운영합니다.',
    ])
  })

  test('같은 업종과 인기 종목을 보여 준다', async ({ page, request }) => {
    const sameSector = (await listStocks(request, 'semiconductor')).filter((stock) => stock.symbol !== '710020')
    const popular = (await listStocks(request)).slice(0, 5)
    await page.goto('/stocks/710020')

    await expect(page.getByRole('region', { name: '같은 업종' }).getByRole('link')).toHaveText(sameSector.map((stock) => stock.name))
    await expect(page.getByRole('region', { name: '인기 종목' }).getByRole('link')).toHaveText(popular.map((stock) => stock.name))
  })

  test('차트 기간을 바꾼다', async ({ page }) => {
    await page.goto('/stocks/710010')
    await expect(page.getByRole('img', { name: '한결반도체 차트' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '1일' })).toHaveAttribute('aria-selected', 'true')

    const response = page.waitForResponse((res) => res.url().includes('/api/stocks/710010/candles?range=1w'))
    await page.getByRole('tab', { name: '1주' }).click()
    await response
    await expect(page.getByRole('tab', { name: '1주' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: '1일' })).toHaveAttribute('aria-selected', 'false')
  })

  test('실시간 시세와 체결을 반영한다', async ({ page, request }) => {
    await page.goto('/stocks/710010')
    await expect(page.getByTestId('price')).toHaveText('71,200원')
    await waitForSubscribers(request, 1)

    await sendTick(request, '710010', 71_500)
    await expect(page.getByTestId('price')).toHaveText('71,500원')
    await expect(page.getByRole('list', { name: '실시간 체결' }).getByRole('listitem').first()).toContainText('71,500원')
  })

  test('지정가 매수 주문을 넣으면 미체결 내역에 보인다', async ({ page }) => {
    await page.goto('/stocks/710010')
    const form = orderForm(page)
    await expect(page.getByTestId('price')).toHaveText('71,200원')

    await form.getByRole('radio', { name: '지정가' }).check()
    await form.getByRole('spinbutton', { name: '가격' }).fill('71000')
    await form.getByRole('spinbutton', { name: '수량' }).fill('3')
    await expect(form.getByTestId('order-amount')).toHaveText('213,000원')
    await form.getByRole('button', { name: '매수 주문' }).click()
    await expect(form.getByRole('status')).toHaveText('주문이 접수되었습니다.')

    await page.goto('/orders')
    await expect(page.getByRole('listitem').filter({ hasText: '한결반도체' })).toContainText('71,000원')
  })

  test('호가 단위로 가격을 올리고 내린다', async ({ page }) => {
    await page.goto('/stocks/710010')
    const form = orderForm(page)
    const price = form.getByRole('spinbutton', { name: '가격' })
    await expect(page.getByTestId('price')).toHaveText('71,200원')

    await price.fill('71000')
    await form.getByRole('button', { name: '호가 올리기' }).click()
    await expect(price).toHaveValue('71100')
    await form.getByRole('button', { name: '호가 내리기' }).click()
    await form.getByRole('button', { name: '호가 내리기' }).click()
    await expect(price).toHaveValue('70900')
  })

  test('시장가 매도 주문이 체결되면 알림을 보여 준다', async ({ page }) => {
    await page.goto('/stocks/710010')
    const form = orderForm(page)
    await expect(page.getByTestId('price')).toHaveText('71,200원')

    await form.getByRole('radio', { name: '매도' }).check()
    await form.getByRole('radio', { name: '시장가' }).check()
    await form.getByRole('spinbutton', { name: '수량' }).fill('2')
    await form.getByRole('button', { name: '매도 주문' }).click()

    await expect(page.getByRole('status').filter({ hasText: '한결반도체 2주 매도 체결' })).toBeVisible()
  })

  test('주문 값이 잘못되면 오류를 보여 준다', async ({ page }) => {
    await page.goto('/stocks/710010')
    const form = orderForm(page)
    await expect(page.getByTestId('price')).toHaveText('71,200원')

    await form.getByRole('spinbutton', { name: '가격' }).fill('71050')
    await form.getByRole('button', { name: '매수 주문' }).click()
    await expect(form.getByRole('alert')).toHaveText('호가 단위에 맞지 않는 가격입니다.')

    await form.getByRole('spinbutton', { name: '가격' }).fill('71000')
    await form.getByRole('spinbutton', { name: '수량' }).fill('0')
    await form.getByRole('button', { name: '매수 주문' }).click()
    await expect(form.getByRole('alert')).toHaveText('수량을 1주 이상 입력해 주세요.')
  })

  test('서버가 주문을 거부하면 이유를 보여 준다', async ({ page }) => {
    await page.goto('/stocks/710050')
    const form = orderForm(page)
    await expect(page.getByTestId('price')).toHaveText('741,000원')

    await form.getByRole('spinbutton', { name: '가격' }).fill('741000')
    await form.getByRole('spinbutton', { name: '수량' }).fill('100')
    await form.getByRole('button', { name: '매수 주문' }).click()
    await expect(form.getByRole('alert')).toHaveText('주문가능금액이 부족합니다.')
  })

  test('없는 종목이면 안내와 인기 종목을 보여 준다', async ({ page }) => {
    await page.goto('/stocks/999999')

    await expect(page.getByText('종목을 찾을 수 없습니다.')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('region', { name: '인기 종목' }).getByRole('link')).toHaveCount(5)
  })

  test('목록에서 들어온 뒤 목록으로 돌아간다', async ({ page }) => {
    await page.goto('/?sector=bio')
    await page.getByRole('link', { name: '단비제약' }).click()
    await expect(page.getByRole('heading', { level: 1, name: '단비제약' })).toBeVisible()

    await page.getByRole('button', { name: '목록으로' }).click()
    await expect(page).toHaveURL('/?sector=bio')
    await expect(page.getByRole('heading', { level: 1, name: '시세' })).toBeVisible()
  })

  test.describe('장 운영 시간이 끝난 뒤', () => {
    test.use({ now: '2026-11-03T16:00:00+09:00' })

    test('주문 버튼을 비활성화한다', async ({ page }) => {
      await page.goto('/stocks/710010')
      await expect(page.getByTestId('price')).toHaveText('71,200원')
      await expect(orderForm(page).getByRole('button', { name: '매수 주문' })).toBeDisabled()
    })
  })
})

test('상세 화면의 현재가는 목록과 같다', async ({ page, request }) => {
  const stock = (await listStocks(request)).find((item) => item.symbol === '750020')!
  await page.goto('/stocks/750020')
  await expect(page.getByTestId('price')).toHaveText(formatPrice(stock.price))
})
