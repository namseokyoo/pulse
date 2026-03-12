# PRD: Pulse (펄스) — 살아있는 익명 게시판

> **v2.1** — 운영 설계 경량화

## 문서 정보

| 항목 | 내용 |
|------|------|
| 버전 | v2.1 |
| 작성일 | 2026-03-12 |
| 작성자 | CEO Agent |
| 상태 | 회장님 승인 |

---

## 1. 제품 개요

- **이름**: Pulse (펄스)
- **태그라인**: "이 글은 아직 살아있다"
- **컨셉**: 모든 글에는 맥박(생명력)이 있다. 사랑받으면 더 오래 살고, 외면당하면 사라진다.

회원제 닉네임 게시판. 모든 글은 작성 시 6시간의 생명력을 갖고 태어난다.
좋아요(+10분) / 싫어요(-10분)로 생명력이 변동된다.
생명력 0이 되면 게시판에서 사라지고 작성자 프로필에만 기록이 남는다.
매일 정오(12:00 KST)에 무료 투표권 10개 충전, 유료 투표권은 별도 구매.

**타겟**: 20-35세 온라인 커뮤니티 활성 이용자

---

## 2. 핵심 기능

### 2.1 생명력(Pulse) 시스템 — P0

| 파라미터 | 값 |
|----------|-----|
| 초기 생명력 (T) | 360분 (6시간) |
| 좋아요 효과 | +10분 |
| 싫어요 효과 | -10분 |
| 최대 생명력 상한 | 없음 |
| 만료 처리 | soft delete (is_dead=true) |
| 만료 후 | 게시판 숨김, 프로필에 기록 보존 (최종 좋아요/싫어요 수 포함) |

**TTL 처리 (3중 구조)**:
- L1: 쿼리 필터 — `WHERE is_dead=false AND expires_at > NOW()`
- L2: pg_cron — 1분마다 만료 글 is_dead=true 스윕
- L3: Trigger — 투표 시 expires_at ≤ now() → 즉각 소멸

상태 전이(alive→dead)는 단일 DB 함수에서만 수행 (race condition 방지).

### 2.2 게시판

| 기능 | Phase |
|------|-------|
| 텍스트 글 작성 (제목 + 본문) | 1 |
| 글 목록 (최신순 기본 + 생명력 적게/많이 필터) | 1 |
| 글 상세 (생명력 타이머 + 투표 버튼) | 1 |
| 댓글 (1단계, 부모 글 소멸 시 함께 숨김) | 1 |
| 대댓글 | 2 |
| 모듈식 에디터 (이미지/링크OG/미니투표) | 2 |

### 2.3 투표권 시스템

**무료 투표권 (Phase 1)**:
- 매일 정오(12:00 KST) 10개 충전, 미사용분 소멸
- 한 글에 1인 무제한 사용 가능
- 유료 투표권과 별도 관리

**유료 투표권 (Phase 2)**:
- 10개 = 2,000원 / 50개 = 9,000원 / 100개 = 16,000원
- 소멸 없음 (영구 보유)

**소진 순서**: 무료 먼저 → 유료

### 2.4 인증/닉네임

| 기능 | Phase |
|------|-------|
| Google OAuth | 1 |
| 이메일+비밀번호 | 2 |
| 카카오톡 | 2 |
| 랜덤 닉네임 부여 (가입 시) | 1 |
| 닉네임 수정 (1회/주) | 1 |
| 닉네임 수정권 판매 | 3 |

### 2.5 프로필

- 살아있는 글 목록 (현재 생명력 표시)
- 죽은 글 기록 (최종 좋아요/싫어요 수, 생존 시간)
- 투표권 잔액 (무료/유료 구분)

### 2.6 신고 기능 (Phase 1)

- 글/댓글에 **신고 버튼** (사유 선택: 욕설/음란/스팸/기타)
- 신고 N건 누적 → **자동 숨김** (is_hidden=true)
- 관리자 확인: Supabase Dashboard에서 직접 확인 (별도 관리자 UI 불필요)

> 이용약관에 금지행위와 "14세 이상 이용" 명시. 일반 게시판 수준의 최소 장치.
> 관리자 대시보드, AI 필터, SLA 프로세스 등은 Phase 3에서 유저 규모에 따라 검토.

### 2.7 구매 페이지 (Phase 2)

- 투표권 패키지 선택 (10/50/100개)
- Lemon Squeezy Checkout 연동
- Webhook → 유료 투표권 즉시 적립
- 구매 내역 페이지

### 2.8 결제 관리 (Phase 2)

- 모든 트랜잭션 기록 (주문ID, 금액, 상태, 타임스탬프)
- Webhook HMAC 서명 검증 + 멱등성 + SKU/금액 재검증
- 환불 시 유료 투표권 회수
- 감사 추적: append-only ledger (vote_balance_logs)

---

## 3. 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 14+ (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| DB/Auth | Supabase (PostgreSQL + Auth + Realtime + pg_cron) |
| TTL | pg_cron (1분 스윕) + Trigger (투표 즉시) |
| 투표권 리셋 | pg_cron (매일 정오 KST) |
| 결제 (Phase 2) | Lemon Squeezy (MoR, 사업자 불필요) |
| 배포 | Vercel |
| 이미지 (Phase 2) | Supabase Storage |

---

## 4. DB 스키마

```sql
-- 프로필
profiles: id, nickname, nickname_changed_at,
          free_votes(10), free_votes_reset_at,
          paid_votes(0), created_at

-- 게시글
posts: id, author_id, title, content(TEXT),
       like_count, dislike_count,
       expires_at, is_dead(false), dead_at,
       reported_count(0), is_hidden(false),
       created_at

-- 댓글
comments: id, post_id, parent_id(NULL),
          author_id, content, created_at

-- 투표 로그
vote_logs: id, user_id, post_id, vote_type(like/dislike),
           votes_used, vote_source(free/paid), created_at

-- 투표권 변동 이력 (append-only ledger)
vote_balance_logs: id, user_id,
                   change_type(daily_reset/vote_spend/purchase/refund),
                   free_change, paid_change,
                   free_after, paid_after,
                   reference_id, created_at

-- 신고
reports: id, reporter_id, target_type(post/comment),
         target_id, reason, status(pending/reviewed/dismissed),
         created_at

-- 결제 기록 (Phase 2)
payment_records: id, user_id, lemon_order_id(UNIQUE),
                 votes_purchased, amount_krw,
                 status(pending/completed/refunded),
                 created_at
```

---

## 5. 개발 단계

### Phase 1: 린 MVP (1~2주)

**검증 가설**: "글 생명력 + 투표 메커니즘이 유저에게 흥미로운가?"

| 포함 | 제외 (→ Phase 2) |
|------|-----------------|
| Google OAuth | 카카오/이메일 로그인 |
| 랜덤 닉네임 + 수정 | 모듈식 에디터 |
| 텍스트 글 (제목+본문) | 이미지 업로드 |
| 글 목록 + 생명력 필터 | 대댓글 |
| 생명력 (T=360분, m=±10분) | 결제/유료 투표권 |
| 무료 투표권 10개/일 (정오) | |
| 1인 1글 무제한 투표 | |
| 댓글 | |
| 프로필 (살아있는/죽은 글) | |
| 신고 + 자동 숨김 | |
| pg_cron TTL + Trigger | |
| 반응형 UI (모바일 우선) | |

**완료 기준 (DoD)**:
- [ ] 글 작성 → 6시간 타이머 동작
- [ ] 투표 → 생명력 ±10분 즉시 변동
- [ ] 생명력 0 → 숨김 + 프로필 기록
- [ ] 투표권 정오 리셋 동작
- [ ] 신고 누적 → 자동 숨김
- [ ] TypeScript strict 에러 0건
- [ ] 모바일 반응형
- [ ] RLS 전 테이블 적용

### Phase 2: 결제 + 확장 (2~3주)
- Lemon Squeezy 결제 연동 + 구매 페이지
- 유료 투표권 (append-only ledger)
- 이메일 + 카카오톡 로그인
- 모듈식 에디터 (이미지/링크OG/미니투표)
- 대댓글
- 결제 내역 페이지

### Phase 3: 고도화 (4주)
- 알림 시스템
- 관리자 패널 + AI 모더레이션
- 닉네임 수정권 판매
- SEO / PWA

---

## 6. 보안

| 항목 | 요구사항 |
|------|----------|
| 투표권 | append-only ledger + 원자적 DB 함수 |
| 상태 전이 | 단일 함수에서만 alive→dead |
| RLS | 전 테이블 |
| Rate Limiting | 글 5건/분, 투표 30건/분 |
| XSS | 입력 sanitization |
| 다계정 | Google OAuth 1인 1계정 |
| 결제 (Phase 2) | HMAC + idempotency + SKU 검증 |

---

## 7. 수익 모델 (Phase 2~)

| 항목 | 내용 |
|------|------|
| 무료 | 글, 댓글, 무료 투표권 10개/일 |
| 수익원 1 | 유료 투표권 — 10개=2,000원 / 50개=9,000원 / 100개=16,000원 |
| 수익원 2 | 닉네임 수정권 (Phase 3) |
| 결제 | Lemon Squeezy (MoR, 수수료 5%+$0.50) |

**마진 시뮬레이션** (1 USD ≈ 1,481 KRW):

| 패키지 | 판매가 | 수수료 | 순수익 | 마진 |
|--------|--------|--------|--------|------|
| 10개 | 2,000원 | ~845원 | ~1,155원 | 58% |
| 50개 | 9,000원 | ~1,181원 | ~7,819원 | 87% |
| 100개 | 16,000원 | ~1,545원 | ~14,455원 | 90% |
