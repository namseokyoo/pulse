# PRD: PulseUp (펄스업) — 살아있는 익명 게시판

> **v2.3** — 보안 강화 + QoL 개선 반영

## 문서 정보

| 항목 | 내용 |
|------|------|
| 버전 | v2.3 |
| 작성일 | 2026-03-17 |
| 작성자 | CEO Agent |
| 상태 | 회장님 승인 |

---

## 1. 제품 개요

- **이름**: PulseUp (펄스업)
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
| 닉네임 고유성 (중복 불가) | 1 |
| 닉네임 스냅샷 (작성 시점 고정) | 1 |
| 닉네임 수정권 판매 | 3 |

### 2.5 프로필

- 살아있는 글 목록 (현재 생명력 표시)
- 죽은 글 기록 (최종 좋아요/싫어요 수, 생존 시간)
- 투표권 잔액 (무료/유료 구분)
- 죽은 글 상세 접근 (작성자 전용) + "다시 작성하기" 부활
- 투표권 리셋 카운트다운 (다음 충전까지 남은 시간)

### 2.6 신고 기능 (Phase 1)

- 글/댓글에 **신고 버튼** (사유 선택: 욕설/음란/스팸/기타)
- 신고 누적 → **자동 숨김** (game_rules.report_hide_threshold, 기본 10건, 관리자 조정 가능)
- 관리자 확인: 관리자 대시보드 (/admin/reports)

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
profiles: id, nickname(UNIQUE), nickname_changed_at,
          free_votes(10), free_votes_reset_at,
          paid_votes(0), created_at

-- 게시글
posts: id, author_id, author_nickname, title, content(TEXT),
       like_count, dislike_count,
       expires_at, is_dead(false), dead_at,
       reported_count(0), is_hidden(false),
       created_at

-- 댓글
comments: id, post_id, parent_id(NULL),
          author_id, author_nickname, content, created_at

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
         created_at,
         UNIQUE(reporter_id, target_type, target_id)

-- 결제 기록 (Phase 2)
payment_records: id, user_id, lemon_order_id(UNIQUE),
                 votes_purchased, amount_krw,
                 status(pending/completed/refunded),
                 created_at

-- 게임 설정 (singleton)
game_rules: id(TRUE), vote_time_change_minutes(10),
            daily_free_votes(10), reset_eligibility_hours(20),
            initial_ttl_minutes(360), report_hide_threshold(10),
            updated_at, change_reason

-- 게임 설정 변경 이력
game_rules_history: id, vote_time_change_minutes, daily_free_votes,
                    reset_eligibility_hours, initial_ttl_minutes,
                    report_hide_threshold, change_reason,
                    changed_by, changed_at

-- 관리자 목록
admin_users: id, uid(UNIQUE), created_at
```

---

## 5. 개발 단계

### Phase 1.0: 린 MVP (1~2주)

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
- [x] 글 작성 → 6시간 타이머 동작
- [x] 투표 → 생명력 ±10분 즉시 변동
- [x] 생명력 0 → 숨김 + 프로필 기록
- [x] 투표권 정오 리셋 동작
- [x] 신고 누적 → 자동 숨김
- [x] TypeScript strict 에러 0건
- [x] 모바일 반응형
- [x] RLS 전 테이블 적용

**추가 완료 항목 (v1.1, 2026-03-16)**:
- 개인정보처리방침 페이지 (/privacy) — PIPA 제30조 준수
- 로그인 동의 체크박스 (이용약관, 개인정보, 14세 이상) — PIPA 제15조, 제22조
- 계정 삭제(탈퇴) 기능 — PIPA 제36~37조
- 이용약관 보강 (10조) — 면책, 탈퇴, 손해배상, 분쟁해결
- 공개 읽기 전용 피드 — 비로그인 사용자 글 열람 가능
- 참여 시점 로그인 유도 — 투표/글쓰기/댓글 시 로그인 리다이렉트
- localStorage 기반 동의 기록 — 기존 회원 체크박스 생략

**추가 완료 항목 (v1.2, 2026-03-17)**:
- 닉네임 스냅샷 — posts/comments에 작성 시점 닉네임 고정 (author_nickname)
- 죽은 글 상세 페이지 — 작성자 전용 접근 + "다시 작성하기" 부활 기능
- 죽은 글 비작성자 안내 — 세계관 맥락의 "사라진 글" 페이지 (404 대체)
- 피드 자동 갱신 — 60초 polling + Visibility API (탭 비활성 시 일시정지)
- 에러 핸들링 일관성 — 로그인/온보딩/댓글/투표 에러 UI 통일
- 로그인 리다이렉트 — ?next= 파라미터로 원래 페이지 복귀
- 닉네임 고유성 — UNIQUE 제약 + 실시간 중복 체크 UI
- 투표권 리셋 타이머 — "다음 충전까지 X시간 Y분" 카운트다운 표시
- 신고 임계치 유연화 — game_rules.report_hide_threshold 연동 (기본 10건, 관리자 조정 가능)
- 관리자 대시보드 — 통계/게시글/유저/신고/게임설정 관리 패널
- as any 타입 단언 전량 제거 — TypeScript strict 타입 안전성 강화

### Phase 1.2: UX 체감 강화 (1주)

**검증 가설**: "생명력 시스템의 긴장감과 참여 보상이 사용자에게 체감되는가?"

> 배경: Phase 1.0 MVP 배포 후 사이트 리뷰 결과, 기술적 시스템은 구현되었으나 사용자 체감 레이어가 부족. "시스템은 있는데 안 보인다" 문제 해결.

| 기능 | 설명 | 우선순위 |
|------|------|---------|
| **생명력 상태 라벨** | 카드/상세에 상태 배지 표시 — "신규 ✨", "안정 💚", "위험 ⚠️", "곧 종료 💀". 기존 4단계 시스템(high/mid/low/critical) 활용 | P0 |
| **투표 피드백 애니메이션** | 투표 시 "+10분 ↑" / "-10분 ↓" 플로팅 텍스트 애니메이션 + 생명력 바 변화 강조 | P0 |
| **히스토리 피드** | 피드에 "방금 죽은 글" / "오래 살아남은 글" 탭 또는 섹션 추가. 글의 수명주기 완결 | P0 |
| **정렬 탭 세계관화** | 라벨 변경 — "최신순" → "방금 태어난", "생명력 적은순" → "곧 죽는 글", "생명력 많은순" → "오래 사는 글" | P1 |
| **첫 진입 3초 룰** | 비로그인 배너를 3줄 핵심 룰로 교체: ① 글은 6시간 후 사라짐 ② 좋아요 = 생명 연장 ③ 싫어요 = 생명 단축 | P1 |
| **세계관 카피 보강** | 상태별 문구 적용 — "심장이 뛰고 있습니다", "맥박이 약해지고 있습니다", "마지막 숨을 쉬고 있습니다" 등 | P1 |

**완료 기준 (DoD)**:
- [ ] 글 카드에 생명력 상태 배지 표시
- [ ] 투표 시 시간 변화 애니메이션 동작
- [ ] 죽은 글/오래 산 글 히스토리 탭 동작
- [ ] 정렬 탭 라벨 세계관 적용
- [ ] 비로그인 배너 3줄 룰 표시
- [ ] 글 상세에 상태별 세계관 문구 표시

**제외 (→ Phase 1.3+)**:
- 프로필/기여 보상 통계 (생존률, 살린 글 수 등) — DB 스키마 추가 필요, 규모 큼

### Phase 2: 결제 + 확장 (2~3주)
- Lemon Squeezy 결제 연동 + 구매 페이지
- 유료 투표권 (append-only ledger)
- 이메일 + 카카오톡 로그인
- 모듈식 에디터 (이미지/링크OG/미니투표)
- 대댓글
- 결제 내역 페이지

### Phase 3: 고도화 (4주)
- 알림 시스템
- AI 모더레이션
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
| 닉네임 변경 | BEFORE UPDATE 트리거 — 서버 시각 강제, 7일 미경과 시 차단 |
| 신고 레이스 | UNIQUE 제약 + ON CONFLICT DO NOTHING (TOCTOU 방지) |
| 투표 레이스 | FOR UPDATE 행 잠금 (만료 경계 동시 투표 방지) |
| 옵티미스틱 UI | 확정 상태(confirmedPost/Balance) 기반 롤백 |

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
