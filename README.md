# 모의투자

React, TanStack Query, react-router, zustand, zod, date-fns, WebSocket으로 만든 작은 모의투자 앱입니다. 웹소켓으로 실시간 시세를 받고, 매수와 매도 주문을 넣을 수 있습니다.

## 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

- 사용자는 1명이고, 종목과 시세는 모두 가상 데이터입니다.
- 데이터는 메모리에 저장되므로 서버를 다시 시작하면 초기화됩니다.
- API는 실제 네트워크처럼 응답이 늦게 올 수 있습니다.
- 주문은 평일 09:00~15:30(한국 시간)에만 받습니다. 그 밖의 시간에도 시세는 계속 움직입니다.

## 과제

### 1단계: 문제 찾기

코드를 읽고 문제가 있다고 생각하는 부분을 모두 찾아 정리해 주세요. 범위는 React, TanStack Query, react-router, zustand, zod, date-fns, WebSocket, 성능입니다. 항목마다 다음 내용을 적습니다.

- 위치 (파일과 줄)
- 무엇이 문제인지
- 어떤 상황에서 문제가 드러나는지
- 어떻게 고치면 좋을지

### 2단계: 리팩토링

1단계에서 정리한 내용을 직접 고쳐 주세요.

- 화면의 동작은 그대로 유지해야 하며, 공개 테스트가 계속 통과해야 합니다.
- `server/`는 실제 백엔드를 대신하는 코드입니다. API와 웹소켓 메시지 형식을 바꾸지 마세요.

## 테스트

```bash
npx playwright install chromium   # 처음 한 번만
npm run test:e2e
npm run typecheck
```

테스트는 production 빌드를 3000번 포트에 띄워서 실행하므로, 실행 전에 개발 서버를 꺼 주세요. 테스트는 화면에서 보이는 동작만 검증하고 코드 구조는 검사하지 않습니다.

## 폴더 구조

```
src/
  components/   UI 컴포넌트
  hooks/        커스텀 훅
  lib/          API, 타입, 포맷과 날짜 유틸
  pages/        라우트별 화면
  store/        zustand store
server/         API와 웹소켓을 흉내 내는 가짜 백엔드(Vite 플러그인)
e2e/            공개 테스트
```

## API와 웹소켓

| 메서드와 경로 | 설명 |
|---|---|
| `GET /api/stocks?sector=` | 종목 목록과 현재 시세(거래대금 순) |
| `GET /api/stocks/:symbol` | 종목 상세(기업 개요 포함) |
| `GET /api/stocks/:symbol/candles?range=1d\|1w\|1m` | 차트 데이터 |
| `GET /api/account` | 예수금, 주문가능금액 |
| `GET /api/portfolio` | 보유 종목 |
| `GET /api/orders?status=open\|filled&cursor=` | 주문 내역(10건씩) |
| `POST /api/orders` | 주문 `{ symbol, side, type, price?, quantity }` |
| `DELETE /api/orders/:id` | 미체결 주문 취소 |

웹소켓 주소는 `/ws`입니다.

- 보내는 메시지: `{ type: 'subscribe', symbols }`, `{ type: 'unsubscribe', symbols }`
- 받는 메시지: `{ type: 'tick', symbol, price, change, changeRate, volume, seq, ts }`(구독한 종목만), `{ type: 'fill', orderId, symbol, side, price, quantity, ts }`(체결 알림), `{ type: 'heartbeat', ts }`(15초마다)
- `seq`는 종목마다 1씩 늘어나는 시세 순번입니다.
