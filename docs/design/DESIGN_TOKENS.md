# Pulse Design Tokens

`Pulse`는 다크 모드 전용 커뮤니티 앱이다. 아래 토큰은 `Next.js + Tailwind CSS + shadcn/ui` 기준으로 바로 옮겨 쓸 수 있는 값만 남겼다.

## 1. Color Tokens

### CSS Variables

```css
@layer base {
  :root {
    color-scheme: dark;

    /* Base */
    --color-background: #0a0a0a;
    --color-surface: #141414;
    --color-surface-elevated: #1e1e1e;
    --color-primary: #ff4444;
    --color-primary-dim: rgba(255, 68, 68, 0.15);
    --color-border: #2a2a2a;

    /* Text */
    --color-text-primary: #ffffff;
    --color-text-secondary: #a0a0a0;
    --color-text-muted: #606060;

    /* Functional */
    --color-like: #22c55e;
    --color-dislike: #ef4444;
    --color-success: #22c55e;
    --color-danger: #ef4444;

    /* Vitality */
    --color-vitality-high: #22c55e;
    --color-vitality-mid: #f59e0b;
    --color-vitality-low: #ef4444;
    --color-vitality-critical: #7f1d1d;
  }
}
```

### Token Map

| Group | Token | Value | Usage |
| --- | --- | --- | --- |
| Base | `background` | `#0A0A0A` | 앱 기본 배경 |
| Base | `surface` | `#141414` | 기본 카드, 입력 영역 |
| Base | `surface-elevated` | `#1E1E1E` | hover 카드, 모달 내부 레이어 |
| Base | `primary` | `#FF4444` | CTA, 위험 상태 강조, FAB |
| Base | `primary-dim` | `rgba(255, 68, 68, 0.15)` | 안내 박스, 선택 배경, glow 베이스 |
| Base | `border` | `#2A2A2A` | 구분선, outline |
| Text | `text-primary` | `#FFFFFF` | 제목, 핵심 수치 |
| Text | `text-secondary` | `#A0A0A0` | 본문, 보조 설명 |
| Text | `text-muted` | `#606060` | placeholder, 비활성 탭 |
| Functional | `like` | `#22C55E` | 좋아요 버튼, 잔액 강조 |
| Functional | `dislike` | `#EF4444` | 싫어요 버튼 |
| Functional | `success` | `#22C55E` | 성공/증가 상태 |
| Functional | `danger` | `#EF4444` | 에러, 감소 상태 |
| Vitality | `vitality-high` | `#22C55E` | 생명력 75% 이상 |
| Vitality | `vitality-mid` | `#F59E0B` | 생명력 40% ~ 74% |
| Vitality | `vitality-low` | `#EF4444` | 생명력 15% ~ 39% |
| Vitality | `vitality-critical` | `#7F1D1D` | 생명력 0% ~ 14% |

## 2. Typography

### Font Family

```css
:root {
  --font-sans: "Pretendard Variable", "Pretendard", system-ui, -apple-system,
    BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

### Type Scale

| Token | Size / Weight | Line Height | Usage |
| --- | --- | --- | --- |
| `heading-1` | `32px / 700` | `1.2` | 큰 페이지 타이틀, 프로필 닉네임 |
| `heading-2` | `24px / 700` | `1.25` | 섹션 타이틀, 모달 타이틀 |
| `heading-3` | `20px / 600` | `1.3` | 카드 제목, 폼 헤더 |
| `body` | `16px / 400` | `1.6` | 기본 본문 |
| `caption` | `13px / 400` | `1.5` | 메타 정보, 타임스탬프 |
| `label` | `14px / 600` | `1.4` | 탭, 버튼, 필드 라벨 |

### Tailwind Utility Example

```tsx
<h1 className="text-[32px] font-bold leading-[1.2] tracking-[-0.04em]">
  살아있는 글
</h1>
<p className="text-base font-normal leading-7 text-text-secondary">
  반응이 붙을수록 이 글의 맥박도 길어진다.
</p>
```

## 3. Spacing

| Token | Value | Typical Usage |
| --- | --- | --- |
| `xs` | `4px` | 아이콘 간격, 미세 offset |
| `sm` | `8px` | 배지 내부 padding, 라벨 간격 |
| `md` | `16px` | 카드 내부 기본 간격 |
| `lg` | `24px` | 카드 블록 분리, 섹션 간격 |
| `xl` | `32px` | 페이지 헤더 여백 |
| `2xl` | `48px` | 큰 섹션 분리 |

```tsx
<div className="space-y-4 px-4 py-6 md:space-y-6 md:px-6" />
```

## 4. Radius

| Token | Value | Usage |
| --- | --- | --- |
| `radius-sm` | `8px` | 작은 배지, 인라인 pill |
| `radius-md` | `12px` | 버튼, 입력 필드 |
| `radius-lg` | `16px` | 카드 보조 패널 |
| `radius-xl` | `20px` | 주요 카드, bottom sheet 내부 요소 |
| `radius-full` | `9999px` | VitalityBar, 탭 underline, 카운터 pill |

## 5. Shadows

| Token | Value | Usage |
| --- | --- | --- |
| `shadow-card` | `0 1px 3px rgba(0,0,0,0.5)` | 기본 카드 |
| `shadow-modal` | `0 -4px 24px rgba(0,0,0,0.6)` | Bottom sheet |
| `shadow-glow-primary` | `0 0 20px rgba(255,68,68,0.3)` | CTA glow, critical pulse |

## 6. Tailwind Config Example

```js
// tailwind.config.js
const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-elevated": "var(--color-surface-elevated)",
        primary: "var(--color-primary)",
        "primary-dim": "var(--color-primary-dim)",
        border: "var(--color-border)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
        like: "var(--color-like)",
        dislike: "var(--color-dislike)",
        success: "var(--color-success)",
        danger: "var(--color-danger)",
        vitality: {
          high: "var(--color-vitality-high)",
          mid: "var(--color-vitality-mid)",
          low: "var(--color-vitality-low)",
          critical: "var(--color-vitality-critical)",
        },
      },
      fontFamily: {
        sans: ["Pretendard Variable", "Pretendard", ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        "heading-1": ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        "heading-2": ["24px", { lineHeight: "1.25", fontWeight: "700" }],
        "heading-3": ["20px", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        caption: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        label: ["14px", { lineHeight: "1.4", fontWeight: "600" }],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.5)",
        modal: "0 -4px 24px rgba(0,0,0,0.6)",
        "glow-primary": "0 0 20px rgba(255,68,68,0.3)",
      },
      keyframes: {
        "pulse-vitality": {
          "0%, 100%": { opacity: "1", transform: "scaleX(1)" },
          "50%": { opacity: "0.82", transform: "scaleX(0.985)" },
        },
        "shake-critical": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-1px)" },
          "75%": { transform: "translateX(1px)" },
        },
      },
      animation: {
        "pulse-vitality": "pulse-vitality 2s ease-in-out infinite",
        "shake-critical": "shake-critical 0.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
```

## 7. Recommended Utility Patterns

```tsx
<article className="rounded-xl border border-border bg-surface p-md shadow-card transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-surface-elevated">
  <div className="mb-sm flex items-center justify-between text-caption text-text-muted">
    <span>달빛나그네</span>
    <span>5h 30m 남음</span>
  </div>
  <div className="h-2 rounded-full bg-white/5">
    <div className="h-full w-[53%] rounded-full bg-vitality-mid" />
  </div>
</article>
```
