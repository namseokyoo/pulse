# Pulse Design Rules

이 문서는 `Pulse` UI를 구현하거나 확장할 때 반드시 지켜야 하는 화면 규칙을 정리한다. 전제는 `Next.js + Tailwind CSS + shadcn/ui`, 다크 모드 전용이다.

## 1. 디자인 원칙

### 1.1 다크 퍼스트
- 모든 컴포넌트는 다크 모드 기준으로 설계한다.
- 라이트 모드는 지원하지 않는다.
- 배경 대비는 `background < surface < surface-elevated` 계층을 기본으로 유지한다.

### 1.2 생명력 시각화 우선
- 글의 상태는 제목보다 먼저 `VitalityBar`와 `VitalityTimer`로 읽혀야 한다.
- 살아있는 글 카드에서는 생명력 영역이 가장 눈에 띄는 포인트여야 한다.
- 색상 단계 변화는 즉시 체감되어야 하며, 상태 판단을 텍스트에 의존하게 만들지 않는다.

### 1.3 정보 밀도 균형
- 카드 안에 너무 많은 수치와 메타를 밀어 넣지 않는다.
- 한 카드에서는 제목, 본문 미리보기, 작성자/시간, 생명력, 반응 수치만 유지한다.
- 댓글, 신고, 상세 액션은 확장 영역 또는 상세 화면으로 넘긴다.

### 1.4 맥박 언어
- `Pulse`의 브랜드 언어는 긴박함과 일시성이다.
- 빨간 glow, 미세한 pulse, 카운트다운 변화로 "아직 살아있다"는 감각을 만든다.
- 애니메이션은 과장보다 리듬감에 집중한다.

## 2. 컬러 사용 규칙

### 2.1 Primary 사용 범위
- `primary (#FF4444)`는 생명력 위험 상태, CTA 버튼, FAB, 활성 underline에만 사용한다.
- 장식용 대면적 배경으로 남용하지 않는다.
- `primary-dim`은 안내 박스, 선택 강조, subtle glow 베이스로 제한한다.

### 2.2 좋아요/싫어요 색상 분리
- `like`와 `dislike` 색상은 한 컨트롤 안에서 혼용하지 않는다.
- 좋아요 버튼은 항상 녹색 계열만, 싫어요 버튼은 항상 빨간 계열만 사용한다.
- 동일 아이콘을 색상만 바꿔 재사용하지 말고 의미가 드러나는 아이콘을 쓴다.

### 2.3 생명력 4단계 엄수
- `75%+`: `vitality-high`
- `40-74%`: `vitality-mid`
- `15-39%`: `vitality-low`
- `0-14%`: `vitality-critical`
- 임의의 중간색이나 gradient 추가는 금지한다. 필요하면 단계 내에서만 alpha/glow를 조절한다.

### 2.4 배경 계층
- 페이지 캔버스는 `background`
- 기본 카드와 입력은 `surface`
- hover, 선택 상태, 모달 내부 강조층은 `surface-elevated`
- 예시 클래스:

```tsx
<div className="min-h-screen bg-background text-text-primary">
  <article className="bg-surface hover:bg-surface-elevated" />
</div>
```

## 3. 반응형 브레이크포인트

### 3.1 Mobile: 375px 기준
- 단일 컬럼 피드
- FAB는 우하단 고정
- `ReportModal`은 전체 너비 bottom sheet
- 카드 내부 정보는 세로 스택 우선

### 3.2 Tablet: 768px
- 피드를 2컬럼까지 확장 가능
- 상단 필터와 프로필 요약은 한 줄 정렬 허용
- 상세 화면에서 본문과 댓글 영역을 분리할 수 있다

### 3.3 Desktop: 1024px
- 좌측 또는 우측에 보조 사이드바 추가 가능
- 메인 피드는 중앙 고정, 보조 영역에 필터/프로필/가이드 배치
- 모달은 여전히 bottom sheet 원칙을 유지하되 최대 폭 제한 적용

### 3.4 Wide: 1440px
- 메인 콘텐츠 최대 폭은 `680px`
- 좌우 여백을 늘리고 카드 폭은 과도하게 넓어지지 않게 제한
- 정보 밀도보다 읽기 리듬을 우선한다

### 3.5 권장 Tailwind 기준

```tsx
<main className="mx-auto max-w-[680px] px-4 md:px-6 lg:px-0">
  <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1" />
</main>
```

## 4. 컴포넌트 사용 가이드라인

### 4.1 VitalityBar + VitalityTimer 동반
- `VitalityBar`는 항상 `VitalityTimer`와 함께 보여준다.
- 막대만 있고 시간 정보가 없으면 상태 해석이 불완전하다.

### 4.2 PostCard 생명력 바 필수
- `PostCard`에서 `VitalityBar` 생략은 금지한다.
- 살아있는 글을 일반 카드처럼 보여주면 `Pulse`의 핵심 차별점이 사라진다.

### 4.3 VoteButton 비로그인 정책
- 로그인하지 않은 상태에서도 `VoteButton`은 숨기지 않는다.
- 대신 `disabled` 상태로 노출해 기능 존재를 학습시키고, 클릭 시 로그인 유도 흐름을 탄다.

### 4.4 ReportModal 형태 고정
- `ReportModal`은 항상 bottom sheet로 구현한다.
- 중앙 `Dialog` 패턴은 금지한다.
- 모바일 기준 thumb reach를 우선하고, 신고는 컨텍스트를 완전히 이탈시키지 않아야 한다.

## 5. 애니메이션 규칙

### 5.1 생명력 타이머
- 1초마다 업데이트한다.
- 숫자만 바뀌고 레이아웃 shift는 없어야 한다.
- `tabular-nums`를 기본 적용한다.

### 5.2 VitalityBar 펄스
- `vitality < 15`일 때만 활성화한다.
- `pulse 2s infinite`를 사용한다.
- critical 상태에서는 빨간 glow와 미세 진동을 함께 허용한다.

### 5.3 로그인 ECG 라인
- `stroke-dasharray` 기반 애니메이션
- `2.5s linear infinite`
- 장식 애니메이션이지만 브랜드 맥박 언어를 설명하는 역할을 한다

### 5.4 카드 hover
- `translateY(-2px)`
- `0.15s ease`
- 데스크톱 이상에서만 적극 사용하고 모바일에서는 시각 강조 수준으로만 유지한다

### 5.5 모달 진입
- `slide-up 0.3s ease-out`
- overlay는 opacity 페이드 인 동반

### 5.6 투표 버튼 피드백
- `scale(0.95) -> scale(1)`
- `0.1s`
- count 숫자는 튀지 말고 안정적으로 유지한다

### 5.7 감소 중인 생명력
- 감소 트리거 직후 짧은 빨간 glow 진동을 허용한다.
- 상시 점멸은 금지한다.

### 5.8 Duration Guide
- `micro`: `100ms`
- `standard`: `200ms`
- `complex`: `300ms`
- `slow`: `500ms`

## 6. 접근성 규칙

### 6.1 터치 영역
- 모든 인터랙티브 요소는 최소 `44x44px`
- 탭, 아이콘 버튼, 스텝퍼, FAB 모두 동일 기준 적용

### 6.2 색상 단독 전달 금지
- 좋아요/싫어요, 생명력 단계는 색상만으로 전달하지 않는다.
- 텍스트, 아이콘, 수치 중 최소 하나를 함께 노출한다.

### 6.3 생명력 타이머 접근성
- `VitalityTimer`에는 `aria-live="polite"`를 설정한다.
- 스크린리더에 과도한 소음을 주지 않도록 1초 전체 문장을 다시 읽게 만들지 않는다.

### 6.4 대비와 포커스
- 본문 대비는 `text-secondary` 이상 유지
- 포커스 링은 `primary` 또는 `like` 계열로 명확히 표시
- 키보드 탐색 시 선택 상태와 포커스 상태가 구분되어야 한다

## 7. Recommended Tailwind Patterns

```tsx
const interactiveClass =
  "min-h-11 min-w-11 rounded-md transition duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95";

const criticalBarClass =
  "bg-vitality-critical shadow-glow-primary animate-pulse-vitality animate-shake-critical";
```
