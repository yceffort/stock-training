import { at, isBusinessDay, kstMidnight, recentBusinessDays } from './clock'
import type { Holding, Order, Sector, StockState } from './state'
import { roundToTick } from './tick-size'

export const SECTORS: Record<Sector, string> = {
  semiconductor: '반도체',
  auto: '자동차',
  bio: '바이오',
  internet: '인터넷',
  finance: '금융',
  chemical: '화학',
}

type StockSeed = [symbol: string, name: string, sector: Sector, prevClose: number, price: number, volume: number, description: string]

const STOCKS: StockSeed[] = [
  ['710010', '한결반도체', 'semiconductor', 70_800, 71_200, 18_500_000, '메모리 반도체를 설계하고 생산하는 종합 반도체 기업입니다.\n서버용 고대역폭 메모리 매출 비중이 꾸준히 늘고 있습니다.\n국내외에 생산 공장 네 곳을 운영합니다.'],
  ['710020', '새빛칩스', 'semiconductor', 152_400, 154_300, 2_100_000, '디스플레이 구동 칩과 전력 관리 칩을 설계하는 팹리스 기업입니다.\n생산은 전량 외부 파운드리에 맡깁니다.'],
  ['710030', '누리실리콘', 'semiconductor', 23_150, 23_450, 3_400_000, '반도체 웨이퍼 세정 장비를 만듭니다.\n주요 고객사는 국내 메모리 업체입니다.'],
  ['710040', '다온세미콘', 'semiconductor', 6_480, 6_540, 5_200_000, '반도체 후공정 패키징과 테스트를 전문으로 합니다.\n차량용 반도체 테스트 물량이 늘고 있습니다.'],
  ['710050', '미르테크', 'semiconductor', 734_000, 741_000, 210_000, '반도체 노광 공정에 쓰이는 정밀 부품을 공급합니다.\n특수 렌즈 코팅 기술을 보유하고 있습니다.\n매출의 80%가 수출에서 나옵니다.'],
  ['720010', '가람모터스', 'auto', 212_000, 215_500, 950_000, '승용차와 상용차를 만드는 완성차 기업입니다.\n전기차 전용 플랫폼을 바탕으로 신차를 출시하고 있습니다.'],
  ['720020', '하늬자동차', 'auto', 88_400, 88_900, 1_300_000, '소형 SUV와 경차에 강점이 있는 완성차 기업입니다.\n동남아시아에 현지 공장을 두고 있습니다.'],
  ['720030', '온누리부품', 'auto', 18_850, 18_720, 2_600_000, '제동 장치와 조향 장치를 만드는 자동차 부품사입니다.\n국내 완성차 두 곳에 납품합니다.'],
  ['720040', '바람기어', 'auto', 3_960, 3_915, 7_800_000, '변속기 기어와 감속기를 생산합니다.\n산업용 로봇 감속기로 사업을 넓히고 있습니다.'],
  ['720050', '솔길모빌리티', 'auto', 48_900, 48_650, 640_000, '차량 공유와 렌터카 서비스를 운영합니다.\n전국 120개 지점에서 차량 2만 대를 관리합니다.'],
  ['730010', '늘봄바이오', 'bio', 4_795, 4_870, 9_100_000, '항체 의약품 위탁 생산을 주력으로 하는 바이오 기업입니다.\n두 번째 생산 공장을 짓고 있습니다.'],
  ['730020', '단비제약', 'bio', 10_050, 9_850, 4_300_000, '감기약과 소화제 같은 일반의약품을 만드는 제약사입니다.\n약국 유통망이 탄탄합니다.'],
  ['730030', '푸른셀', 'bio', 342_500, 338_000, 180_000, '세포 치료제를 개발하는 바이오 기업입니다.\n임상 3상을 진행 중인 후보 물질이 두 개 있습니다.'],
  ['730040', '이음헬스', 'bio', 1_252, 1_235, 12_000_000, '병원용 전자 의무 기록 소프트웨어를 공급합니다.\n원격 진료 플랫폼을 시범 운영하고 있습니다.'],
  ['730050', '초록진단', 'bio', 37_950, 37_800, 520_000, '체외 진단 키트와 분석 장비를 만듭니다.\n매출의 절반 이상이 해외에서 나옵니다.'],
  ['740010', '구름소프트', 'internet', 223_000, 218_500, 1_050_000, '포털 서비스와 클라우드 인프라 사업을 함께 운영합니다.\n월간 이용자는 3천만 명입니다.\n최근 생성형 AI 검색 서비스를 공개했습니다.'],
  ['740020', '모아플랫폼', 'internet', 52_800, 52_300, 1_900_000, '중고 거래와 지역 커뮤니티 앱을 운영합니다.\n광고와 간편 결제 수수료가 주요 수익원입니다.'],
  ['740030', '여울게임즈', 'internet', 468_000, 471_500, 95_000, '모바일 롤플레잉 게임을 개발하고 서비스합니다.\n대표작은 출시 5년째 매출 상위권을 지키고 있습니다.'],
  ['740040', '별꽃미디어', 'internet', 12_280, 12_350, 1_500_000, '웹툰과 웹소설 플랫폼을 운영하는 콘텐츠 기업입니다.\n2024년부터 영상 스트리밍 서비스 <Nova> 브랜드를 함께 운영하고 있습니다.\n해외 이용자 비중은 40%입니다.'],
  ['740050', '너울페이', 'internet', 2_455, 2_480, 6_600_000, '간편 결제와 송금 서비스를 제공합니다.\n가맹점 수는 50만 곳입니다.'],
  ['750010', '든든은행', 'finance', 61_200, 61_700, 1_700_000, '전국 지점망을 갖춘 시중 은행입니다.\n중소기업 대출 비중이 높습니다.'],
  ['750020', '한울증권', 'finance', 9_420, 9_510, 2_200_000, '개인 투자자 대상 온라인 중개에 강한 증권사입니다.\n해외 주식 거래 고객이 늘고 있습니다.'],
  ['750030', '미소캐피탈', 'finance', 1_684, 1_702, 3_100_000, '자동차 할부 금융과 리스를 제공합니다.\n중고차 금융 상품을 새로 출시했습니다.'],
  ['750040', '바른보험', 'finance', 287_000, 289_500, 120_000, '생명보험과 연금 상품을 판매합니다.\n보유 계약 수는 400만 건입니다.'],
  ['750050', '새날금융지주', 'finance', 126_500, 127_400, 610_000, '은행, 카드, 보험 자회사를 둔 금융지주회사입니다.\n배당 성향을 단계적으로 높이고 있습니다.'],
  ['760010', '해솔케미칼', 'chemical', 512_000, 505_000, 260_000, '이차전지 양극재를 생산하는 소재 기업입니다.\n유럽 완성차 업체와 장기 공급 계약을 맺었습니다.'],
  ['760020', '맑은소재', 'chemical', 198_700, 197_300, 340_000, '반도체 공정용 특수 가스와 화학 소재를 만듭니다.\n고순도 정제 기술을 보유하고 있습니다.'],
  ['760030', '단단화학', 'chemical', 15_940, 16_120, 1_100_000, '합성수지와 산업용 접착제를 생산합니다.\n친환경 바이오 플라스틱 설비를 증설하고 있습니다.'],
  ['760040', '고운에너지', 'chemical', 34_600, 35_250, 780_000, '태양광 모듈과 에너지 저장 장치를 만듭니다.\n미국 공장이 올해 가동을 시작했습니다.'],
  ['760050', '빛가람정유', 'chemical', 112_300, 111_800, 450_000, '원유 정제와 석유화학 제품을 생산합니다.\n하루 원유 처리 능력은 40만 배럴입니다.'],
]

export function random(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hash(text: string) {
  let value = 2166136261
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619)
  return value >>> 0
}

export function createStocks() {
  return new Map<string, StockState>(
    STOCKS.map(([symbol, name, sector, prevClose, price, volume, description]) => [
      symbol,
      { symbol, name, sector, description, prevClose, price, volume, seq: 1 },
    ]),
  )
}

export function createHoldings() {
  const holdings: Holding[] = [
    { symbol: '710010', quantity: 20, avgPrice: 68_500 },
    { symbol: '730010', quantity: 150, avgPrice: 4_210 },
    { symbol: '740010', quantity: 3, avgPrice: 230_000 },
  ]
  return new Map(holdings.map((holding) => [holding.symbol, holding]))
}

// 영업일별 체결 시각(KST), 최근 영업일부터
const FILLED_TIMES = [
  ['09:03', '09:13', '09:23'],
  ['09:30', '10:16', '13:36', '13:52', '15:20'],
  ['09:12', '10:05', '11:40', '13:18', '14:47', '15:05'],
  ['09:41', '11:02', '13:55', '15:12'],
  ['09:08', '10:33', '11:51', '14:09', '15:24'],
  ['09:47', '11:15', '13:30', '14:58'],
  ['09:05', '10:22', '12:48', '14:01', '15:17'],
  ['09:36', '11:27', '13:44', '15:02'],
  ['09:14', '10:51', '12:06', '14:35', '15:28'],
  ['09:22', '11:09', '13:57', '14:44'],
]

export function createOrders(stocks: Map<string, StockState>, nowMs: number) {
  const next = random(20261103)
  const symbols = [...stocks.keys()]
  const today = kstMidnight(nowMs)
  const days = recentBusinessDays(nowMs, FILLED_TIMES.length)
  if (days[0] !== today) days.unshift(today)

  const orders: Order[] = []
  let id = 1
  FILLED_TIMES.forEach((times, index) => {
    const day = days[index]
    if (day === today && !isBusinessDay(today)) return
    for (const time of times) {
      const [hour, minute] = time.split(':').map(Number)
      const filledAt = at(day, hour, minute)
      if (filledAt > nowMs - 5 * 60_000) continue
      const stock = stocks.get(symbols[Math.floor(next() * symbols.length)])!
      const price = roundToTick(stock.prevClose * (0.97 + next() * 0.06))
      const type = next() < 0.6 ? 'market' : 'limit'
      orders.push({
        id: `o${id++}`,
        symbol: stock.symbol,
        side: next() < 0.6 ? 'buy' : 'sell',
        type,
        price,
        quantity: Math.max(1, Math.floor((next() * 3_000_000) / price)),
        status: 'filled',
        createdAt: type === 'market' ? filledAt : Math.max(at(day, 9, 0), filledAt - Math.floor(next() * 60) * 60_000),
        filledAt,
      })
    }
  })

  const openOrder = (symbol: string, price: number, quantity: number, createdAt: number): Order => ({
    id: `o${id++}`,
    symbol,
    side: 'buy',
    type: 'limit',
    price,
    quantity,
    status: 'open',
    createdAt,
    filledAt: null,
  })
  orders.push(
    openOrder('740020', 51_000, 5, at(days[1], 14, 10)),
    openOrder('710040', 6_400, 30, nowMs - 25 * 60_000),
    openOrder('710020', 150_000, 2, nowMs - 3 * 60_000),
  )
  return { orders, nextOrderId: id }
}
