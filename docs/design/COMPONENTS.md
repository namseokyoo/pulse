# Pulse Phase 1 Components

아래 명세는 `app/components/pulse/*` 기준으로 바로 구현 가능한 수준의 계약서다. 예시 코드는 `Next.js + Tailwind CSS + shadcn/ui`를 기준으로 작성했다.

## Shared Types

```ts
export interface PostType {
  id: string;
  title: string;
  content: string;
  nickname: string;
  vitality: number;
  likes: number;
  dislikes: number;
  expiresAt: Date;
  createdAt: Date;
  survivedMinutes?: number;
}

export interface CommentType {
  id: string;
  nickname: string;
  content: string;
  createdAt: Date;
}

export interface FilterOption {
  value: string;
  label: string;
}
```

## 1. VitalityBar

### Purpose
게시글의 남은 생명력을 가장 빠르게 읽히게 하는 핵심 시각 요소. 모든 살아있는 글에 기본 포함한다.

### Props

```ts
export interface VitalityBarProps {
  vitality: number; // 0-100
  height?: number;
  showLabel?: boolean;
}
```

### Visual Spec
- 기본 높이 `8px`, 옵션으로 `6px`, `10px`, `12px` 확장 허용
- 트랙 배경: `bg-white/6`
- `75+`: `bg-vitality-high`
- `40-74`: `bg-vitality-mid`
- `15-39`: `bg-vitality-low`
- `0-14`: `bg-vitality-critical` + `animate-pulse-vitality animate-shake-critical`
- 라벨이 켜지면 우측 또는 하단에 `생명력 53%` 형식 표기

### Example

```tsx
<VitalityBar
  vitality={53}
  showLabel
/>
```

```tsx
<div className="space-y-2">
  <VitalityBar vitality={9} height={10} />
  <p className="text-[13px] text-text-muted">생명력 9%</p>
</div>
```

## 2. VitalityTimer

### Purpose
게시글의 남은 시간을 텍스트로 보완하는 카운트다운. `VitalityBar`와 항상 함께 노출한다.

### Props

```ts
export interface VitalityTimerProps {
  expiresAt: Date;
  size?: "sm" | "md" | "lg";
}
```

### Visual Spec
- 출력 형식: `5h 30m`, `54m`, `12s`
- 색상 단계는 현재 남은 비율을 계산해 `VitalityBar`와 동일하게 매핑
- `sm`: `text-[12px]`
- `md`: `text-[13px]`
- `lg`: `text-[16px] font-semibold`
- `tabular-nums` 적용으로 폭 흔들림 방지
- `aria-live="polite"` 설정

### Example

```tsx
<VitalityTimer expiresAt={post.expiresAt} size="md" />
```

## 3. PostCard

### Purpose
피드에서 글의 핵심 맥락과 생명력 상태를 한 번에 보여주는 기본 카드.

### Props

```ts
export interface PostCardProps {
  post: PostType;
  onVote?: (type: "like" | "dislike", amount: number) => void;
  onReport?: (postId: string) => void;
}
```

### Visual Spec
- 컨테이너: `rounded-xl border border-white/5 bg-surface p-md shadow-card`
- hover: `bg-surface-elevated -translate-y-0.5 transition-all duration-150 ease-out`
- 구조: 제목 → 2줄 본문 미리보기 → `[닉네임 | 남은시간]` → 생명력 바 → `[생명력% | 좋아요 수 | 싫어요 수]`
- 제목 `20px/600`, 본문 `14px/1.55`, 메타 `13px`
- 본문은 `line-clamp-2`

### Example

```tsx
<PostCard
  post={post}
  onVote={(type, amount) => votePost(post.id, type, amount)}
  onReport={(postId) => setReportTarget(postId)}
/>
```

## 4. VoteButton

### Purpose
좋아요와 싫어요 행동을 분리된 의미로 표현하면서 투표권 개수 선택까지 제공하는 액션 버튼.

### Props

```ts
export interface VoteButtonProps {
  type: "like" | "dislike";
  count: number;
  selected?: boolean;
  disabled?: boolean;
  onVote?: (amount: number) => void;
}
```

### Visual Spec
- 최소 터치 영역 `44x44`
- 내부 구조: `[-] [n] [+]` 스텝퍼 + 아이콘 버튼
- `like`: `bg-like/12 text-like border-like/20`, 하트 아이콘
- `dislike`: `bg-dislike/12 text-dislike border-dislike/20`, 깨진 하트 아이콘
- 선택 상태: 배경 농도 증가 + ring
- 비활성 상태: `opacity-50 cursor-not-allowed`
- 탭 피드백: `active:scale-95 transition-transform duration-100`

### Example

```tsx
<VoteButton
  type="like"
  count={2}
  selected={userVote === "like"}
  onVote={(amount) => votePost(post.id, "like", amount)}
/>
```

## 5. CommentItem

### Purpose
댓글 리스트에서 발화자와 시간을 명확히 유지하면서 본문 가독성을 확보하는 기본 항목.

### Props

```ts
export interface CommentItemProps {
  comment: CommentType;
}
```

### Visual Spec
- 컨테이너: `py-3`
- 헤더: `닉네임 + 작성시간`, `text-[13px]`, 닉네임은 `text-text-primary font-semibold`
- 본문: `text-[15px] leading-6 text-text-secondary`
- 구분선 필요 시 마지막을 제외하고 `border-b border-border`

### Example

```tsx
<CommentItem comment={comment} />
```

## 6. VoteBalance

### Purpose
사용자의 남은 투표권을 헤더 또는 카드 문맥에서 즉시 확인하게 하는 상태 표시 컴포넌트.

### Props

```ts
export interface VoteBalanceProps {
  balance: number;
  variant?: "compact" | "card";
}
```

### Visual Spec
- `compact`: 헤더용 pill, `h-10 px-3 rounded-md`, 녹색 tinted 배경
- `card`: 프로필용 강조 카드, `rounded-xl p-lg`, 큰 숫자 표시
- 텍스트 포맷: `48개`
- 색상: `bg-like/12 text-like border-like/20`

### Example

```tsx
<VoteBalance balance={48} variant="compact" />
<VoteBalance balance={48} variant="card" />
```

## 7. FilterTabs

### Purpose
피드 또는 프로필 목록의 정렬/상태 전환을 빠르게 처리하는 탭 네비게이션.

### Props

```ts
export interface FilterTabsProps {
  options: FilterOption[];
  selected: string;
  onChange: (value: string) => void;
}
```

### Visual Spec
- 가로 스크롤 허용
- 활성: `text-white` + 하단 `2px` 빨간 underline
- 비활성: `text-text-muted`
- 탭 높이 최소 `44px`
- underline은 `rounded-full shadow-glow-primary`

### Example

```tsx
<FilterTabs
  options={[
    { value: "latest", label: "최신" },
    { value: "burning", label: "불타는 글" },
    { value: "ending", label: "곧 끝남" },
  ]}
  selected={sort}
  onChange={setSort}
/>
```

## 8. PostForm

### Purpose
새 글 작성 화면의 입력 흐름을 정의하는 폼. 제목, 본문, 생명력 안내, 글자 수를 한 화면에서 처리한다.

### Props

```ts
export interface PostFormValues {
  title: string;
  content: string;
}

export interface PostFormProps {
  onSubmit: (values: PostFormValues) => void;
  maxLength?: number;
}
```

### Visual Spec
- 제목 입력: `text-[32px] font-bold tracking-[-0.04em]`
- 본문 입력: `text-base leading-7 text-text-secondary`
- 생명력 안내 박스: `rounded-xl border border-primary/25 bg-primary-dim p-md`
- 글자 수: 우측 정렬 `text-caption text-text-muted`
- 제출 버튼: `bg-primary text-white`

### Example

```tsx
<PostForm
  maxLength={500}
  onSubmit={(values) => createPost(values)}
/>
```

## 9. ReportModal

### Purpose
게시글 신고 사유를 선택하고 제출하는 전용 bottom sheet. `Dialog` 패턴 대신 모바일 바텀시트만 허용한다.

### Props

```ts
export type ReportReason = "abuse" | "adult" | "spam" | "other";

export interface ReportModalProps {
  isOpen: boolean;
  postId: string;
  onClose: () => void;
  onSubmit: (reason: ReportReason, detail?: string) => void;
}
```

### Visual Spec
- 위치: viewport bottom 고정
- 컨테이너: `rounded-t-[28px] bg-surface shadow-modal`
- handle 포함, overlay는 `bg-black/60`
- 사유 목록: `욕설/혐오`, `음란`, `스팸`, `기타`
- 선택 라디오: `border-primary` + 내부 dot glow
- 기타 선택 시 상세 입력 노출
- 진입 애니메이션: `slide-up 0.3s ease-out`

### Example

```tsx
<ReportModal
  isOpen={Boolean(reportTarget)}
  postId={reportTarget ?? ""}
  onClose={() => setReportTarget(null)}
  onSubmit={(reason, detail) => submitReport(reportTarget!, reason, detail)}
/>
```

## 10. ProfileHeader

### Purpose
프로필 상단에서 닉네임과 편집 액션, 투표권 잔액을 묶어 보여주는 헤더 블록.

### Props

```ts
export interface ProfileHeaderProps {
  nickname: string;
  onEdit?: () => void;
  balance: number;
}
```

### Visual Spec
- 닉네임: `text-[32px] font-bold tracking-[-0.04em]`
- 수정 버튼: `40x40`, `rounded-md`, `bg-white/4`
- 하단에 `VoteBalance variant="card"` 포함
- 상단 여백이 넉넉해야 하며 모바일에서 `pt-6` 기준

### Example

```tsx
<ProfileHeader
  nickname="달빛나그네"
  balance={48}
  onEdit={() => router.push("/profile/edit")}
/>
```

## 11. PostList

### Purpose
살아있는 글과 죽은 글을 동일한 컬렉션 컴포넌트 안에서 타입에 따라 다르게 렌더링하는 목록 래퍼.

### Props

```ts
export interface PostListProps {
  posts: PostType[];
  type: "alive" | "dead";
  loading?: boolean;
  empty?: boolean;
}
```

### Visual Spec
- `alive`: 제목 + `VitalityBar` + `VitalityTimer`
- `dead`: 제목 + 최종 좋아요/싫어요 + 생존 시간
- 아이템 간 간격 `16px`
- 로딩 상태는 skeleton 3개
- empty 상태는 `text-text-muted` 문구와 CTA 버튼 가능

### Example

```tsx
<PostList posts={alivePosts} type="alive" loading={isLoading} />
<PostList posts={deadPosts} type="dead" empty={!deadPosts.length} />
```

## Implementation Notes

- `VitalityBar`와 `VitalityTimer`는 동일한 vitality 계산 함수를 공유한다.
- `VoteButton`은 비로그인 상태에서도 레이아웃이 유지되도록 disable만 적용한다.
- `PostCard`, `PostList`, `ProfileHeader`는 모두 `VoteBalance`, `VitalityBar`, `VitalityTimer`를 재조합하는 방향으로 설계한다.
- 권장 클래스 시작점:

```tsx
const cardClass =
  "rounded-xl border border-white/5 bg-surface p-md shadow-card transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-surface-elevated";
```
