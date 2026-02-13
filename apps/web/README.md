# GOKO - 여행 계획 도구

> 옵시디언(Obsidian)의 자유로운 캔버스와 구글 맵의 지리 정보가 결합된 살아있는 여행 플래너

## 핵심 기능

- **Split Layout**: 좌측 지도 + 우측 무한 캔버스
- **Infinite Canvas**: 장소 카드를 자유롭게 배치하고 연결
- **지도 동기화**: 캔버스 변경이 지도 마커/경로에 실시간 반영
- **Branch (Auto-Route)**: 위/경도 기반 경로 자동 최적화
- **로컬 저장**: 새로고침 후에도 상태 유지

## 기술 스택

- **Frontend**: React 18 + TypeScript
- **Canvas**: React Flow (무한 캔버스, 노드/엣지)
- **Map**: @react-google-maps/api
- **State**: Zustand (persist middleware)
- **Build**: Vite
- **Test**: Vitest + Playwright

## 폴더 구조

```
src/
├── app/                  # 앱 진입점
│   ├── main.tsx
│   ├── App.tsx
│   └── styles/
├── domain/               # 순수 비즈니스 로직 (UI 무관)
│   ├── route/            # haversine, routeOptimizer
│   └── layout/           # autoArrange
├── store/                # Zustand 상태 관리
│   └── useBoardStore.ts
├── services/             # 외부 API 어댑터
│   └── map/              # Google Maps 관련
├── components/           # UI 컴포넌트
│   ├── layout/           # SplitView, CollapseToggle
│   └── features/         # map/, canvas/, toolbar/
├── pages/                # 페이지 컴포넌트
├── shared/               # 공용 타입, 유틸
│   ├── types/
│   └── utils/
└── tests/                # 테스트 설정
```

## 시작하기

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

```bash
cp apps/web/.env.example apps/web/.env
# .env 파일에 Google Maps API 키 입력
```

Google Maps API 키 발급:
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. Maps JavaScript API, Places API 활성화
3. API 키 생성 및 HTTP Referer 제한 설정

### 3. 개발 서버 실행

```bash
pnpm dev
```

http://localhost:5173 에서 확인

## 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 개발 서버 실행 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm preview` | 빌드 결과 미리보기 |
| `pnpm test` | 유닛 테스트 실행 |
| `pnpm test:e2e` | E2E 테스트 실행 |
| `pnpm lint` | ESLint 검사 |
| `pnpm format` | Prettier 포맷팅 |

## 테스트

```bash
# 유닛 테스트
pnpm test

# 테스트 watch 모드
pnpm --filter @goko/web test:watch

# E2E 테스트 (Playwright)
pnpm test:e2e
```

## API 키 보안

- API 키는 `.env` 파일에만 저장 (`.gitignore`에 포함)
- Google Cloud Console에서 HTTP Referer 제한 필수
- 일일 쿼터 제한 설정 권장
