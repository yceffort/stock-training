import { expect, formatPrice, getAccount, listStocks, sendTick, test, waitForSubscribers } from './helpers'

const rows = (page: import('@playwright/test').Page) => page.getByRole('table', { name: '종목 시세' }).getByRole('row').filter({ has: page.getByRole('link') })

test.describe('시세 목록', () => {
  test('종목 30개를 현재가와 함께 보여 준다', async ({ page, request }) => {
    const stocks = await listStocks(request)
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: '시세' })).toBeVisible()
    await expect(rows(page)).toHaveCount(30)
    const first = stocks.find((stock) => stock.name === '한결반도체')!
    const row = rows(page).filter({ hasText: '한결반도체' })
    await expect(row.getByTestId('price')).toHaveText(formatPrice(first.price))
    await expect(row.getByRole('link', { name: '한결반도체' })).toHaveAttribute('href', '/stocks/710010')
  })

  test('URL의 조건을 필터와 결과에 반영한다', async ({ page, request }) => {
    const bio = await listStocks(request, 'bio')
    const expected = bio.toSorted((a, b) => Number(b.price) - Number(a.price)).map((stock) => stock.name)
    await page.goto('/?sector=bio&sort=price-desc')

    await expect(page.getByRole('combobox', { name: '업종' })).toHaveValue('bio')
    await expect(page.getByRole('combobox', { name: '정렬' })).toHaveValue('price-desc')
    await expect(rows(page).getByRole('link')).toHaveText(expected)
  })

  test('URL의 검색어로 걸러서 보여 준다', async ({ page }) => {
    await page.goto('/?q=바이오')

    await expect(page.getByRole('searchbox', { name: '종목 검색' })).toHaveValue('바이오')
    await expect(rows(page).getByRole('link')).toHaveText(['늘봄바이오'])
  })

  test('검색어를 입력하는 대로 결과를 걸러 낸다', async ({ page }) => {
    await page.goto('/')
    await expect(rows(page)).toHaveCount(30)

    await page.getByRole('searchbox', { name: '종목 검색' }).fill('반도체')
    await expect(rows(page).getByRole('link')).toHaveText(['한결반도체'])
    await expect(page).toHaveURL(/q=%EB%B0%98%EB%8F%84%EC%B2%B4/)

    await page.getByRole('searchbox', { name: '종목 검색' }).fill('없는종목')
    await expect(page.getByText('조건에 맞는 종목이 없습니다.')).toBeVisible()
  })

  test('업종을 고르면 그 업종의 종목만 보여 준다', async ({ page, request }) => {
    const finance = await listStocks(request, 'finance')
    await page.goto('/')
    await expect(rows(page)).toHaveCount(30)

    await page.getByRole('combobox', { name: '업종' }).selectOption({ label: '금융' })
    await expect(page).toHaveURL(/sector=finance/)
    await expect(rows(page).getByRole('link')).toHaveText(finance.map((stock) => stock.name).toSorted((a, b) => a.localeCompare(b, 'ko')))
  })

  test('정렬 기준을 바꾼다', async ({ page, request }) => {
    const stocks = await listStocks(request)
    await page.goto('/')
    await expect(rows(page)).toHaveCount(30)

    await page.getByRole('combobox', { name: '정렬' }).selectOption({ label: '현재가 높은순' })
    const byPrice = stocks.toSorted((a, b) => Number(b.price) - Number(a.price)).map((stock) => stock.name)
    await expect(rows(page).getByRole('link')).toHaveText(byPrice)

    await page.getByRole('combobox', { name: '정렬' }).selectOption({ label: '이름순' })
    await expect(rows(page).getByRole('link')).toHaveText(stocks.map((stock) => stock.name).toSorted((a, b) => a.localeCompare(b, 'ko')))
  })

  test('관심종목을 등록하고 관심종목만 볼 수 있다', async ({ page }) => {
    await page.goto('/')
    const toggle = page.getByRole('button', { name: '새빛칩스 관심종목' })

    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('checkbox', { name: '관심종목만' }).click()
    await expect(page.getByRole('checkbox', { name: '관심종목만' })).toBeChecked()
    await expect(page).toHaveURL(/watch=1/)
    await expect(rows(page).getByRole('link')).toHaveText(['새빛칩스'])

    await page.reload()
    await expect(rows(page).getByRole('link')).toHaveText(['새빛칩스'])
    await page.getByRole('button', { name: '새빛칩스 관심종목' }).click()
    await expect(page.getByText('조건에 맞는 종목이 없습니다.')).toBeVisible()
  })

  test('실시간 시세를 반영한다', async ({ page, request }) => {
    await page.goto('/')
    await expect(rows(page)).toHaveCount(30)
    await waitForSubscribers(request, 30)

    await sendTick(request, '760030', 16_200)
    await expect(rows(page).filter({ hasText: '단단화학' }).getByTestId('price')).toHaveText('16,200원')
  })

  test('시장가로 빠르게 매수한다', async ({ page, request }) => {
    const before = await getAccount(request)
    await page.goto('/')
    await expect(page.getByTestId('buyable-cash')).toHaveText(formatPrice(before.buyable))

    await page.getByRole('spinbutton', { name: '너울페이 수량' }).fill('2')
    await page.getByRole('button', { name: '너울페이 시장가 매수' }).click()

    await expect(page.getByRole('status').filter({ hasText: '너울페이 2주 매수 체결' })).toBeVisible()
    await expect(page.getByTestId('buyable-cash')).toHaveText(formatPrice(Number(before.buyable) - 2_480 * 2))
  })
})
