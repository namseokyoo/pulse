-- ============================================================
-- Migration: 20260317000007_payment_foundation.sql
-- Date: 2026-03-17
-- Purpose: 결제 기능 도입 선제 기반 구축 (Phase 1.5)
--   1. profiles CHECK 제약 (음수 방지)
--   2. vote_balance_logs 확장 (reference_type, payment_order_id)
--   3. 기존 데이터 백필
-- ============================================================

-- ============================================================
-- 1. profiles: 투표권 음수 방지 CHECK 제약
-- 현재 free_votes, paid_votes 모두 0 이상이므로 안전하게 추가 가능
-- ============================================================

ALTER TABLE profiles
  ADD CONSTRAINT profiles_free_votes_nonneg CHECK (free_votes >= 0);

ALTER TABLE profiles
  ADD CONSTRAINT profiles_paid_votes_nonneg CHECK (paid_votes >= 0);

-- ============================================================
-- 2. vote_balance_logs: reference_type 컬럼 추가
-- reference_id가 무엇을 가리키는지 명시 (post, payment_order, refund, manual)
-- NULL 허용 (기존 row 호환)
-- ============================================================

ALTER TABLE vote_balance_logs
  ADD COLUMN IF NOT EXISTS reference_type TEXT
    CHECK (reference_type IN ('post', 'payment_order', 'refund', 'manual'));

-- ============================================================
-- 3. vote_balance_logs: payment_order_id 컬럼 추가
-- Phase 2에서 payment_orders 테이블 생성 후 FK 추가 예정
-- 현재는 NULL 허용 컬럼만 선추가
-- ============================================================

ALTER TABLE vote_balance_logs
  ADD COLUMN IF NOT EXISTS payment_order_id UUID;

-- ============================================================
-- 4. 기존 데이터 백필
-- vote_spend → reference_type='post' (reference_id가 post UUID)
-- daily_reset → reference_type=NULL (참조 대상 없음)
-- purchase, refund → reference_type=NULL (아직 사용 안 됨)
-- ============================================================

UPDATE vote_balance_logs
SET reference_type = 'post'
WHERE change_type = 'vote_spend' AND reference_type IS NULL;

-- ============================================================
-- 5. 멱등 인덱스 (Phase 2 결제 연동 시 이중 충전/환불 방지)
-- payment_order_id당 purchase는 1건, refund는 1건만 허용
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS vote_balance_logs_purchase_once
  ON vote_balance_logs(payment_order_id, change_type)
  WHERE change_type = 'purchase' AND payment_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vote_balance_logs_refund_once
  ON vote_balance_logs(payment_order_id, change_type)
  WHERE change_type = 'refund' AND payment_order_id IS NOT NULL;
