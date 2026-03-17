-- ============================================================
-- Migration: 20260317000008_payment_tables.sql
-- Date: 2026-03-17
-- Purpose: 결제 3축 원장 테이블 생성 (Phase 2)
--   1. payment_orders — 결제 주문 원장
--   2. payment_events — PG 웹훅 수신함
--   3. user_entitlements — 범용 권리 원장
-- ============================================================

-- 1. 결제 주문 원장
CREATE TABLE payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  product_type TEXT NOT NULL CHECK (product_type IN ('paid_votes', 'nickname_change_pass')),
  product_qty INTEGER NOT NULL CHECK (product_qty > 0),
  amount_krw INTEGER NOT NULL CHECK (amount_krw > 0),
  provider TEXT NOT NULL DEFAULT 'lemonsqueezy',
  provider_order_id TEXT,
  provider_payment_id TEXT,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created' CHECK (
    status IN ('created','paid','fulfilled','cancel_requested',
               'cancelled','refund_pending','refunded','failed')
  ),
  paid_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_order_id),
  UNIQUE (idempotency_key)
);

-- 2. 웹훅 수신함
CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_order_id UUID REFERENCES payment_orders(id),
  provider TEXT NOT NULL DEFAULT 'lemonsqueezy',
  provider_event_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  process_result TEXT,
  UNIQUE (provider, provider_event_id)
);

-- 3. 범용 권리 원장
CREATE TABLE user_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  payment_order_id UUID NOT NULL REFERENCES payment_orders(id),
  entitlement_type TEXT NOT NULL CHECK (
    entitlement_type IN ('paid_votes', 'nickname_change_pass')
  ),
  granted_qty INTEGER NOT NULL CHECK (granted_qty > 0),
  remaining_qty INTEGER NOT NULL CHECK (remaining_qty >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'consumed', 'revoked', 'expired')
  ),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ
);

-- RLS 활성화
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;

-- payment_orders: 본인 주문만 조회
CREATE POLICY "payment_orders_select_own" ON payment_orders
  FOR SELECT USING (auth.uid() = profile_id);

-- user_entitlements: 본인만 조회
CREATE POLICY "user_entitlements_select_own" ON user_entitlements
  FOR SELECT USING (auth.uid() = profile_id);

-- 인덱스
CREATE INDEX idx_payment_orders_profile ON payment_orders(profile_id, created_at DESC);
CREATE INDEX idx_payment_orders_status ON payment_orders(status) WHERE status NOT IN ('fulfilled', 'failed', 'cancelled', 'refunded');
CREATE INDEX idx_payment_events_order ON payment_events(payment_order_id);
CREATE INDEX idx_user_entitlements_profile ON user_entitlements(profile_id, status);

-- vote_balance_logs에 payment_order_id FK 추가 (Phase 1.5에서 컬럼만 추가했음)
ALTER TABLE vote_balance_logs
  ADD CONSTRAINT fk_vote_balance_payment_order
  FOREIGN KEY (payment_order_id) REFERENCES payment_orders(id);

-- 결제 완료 → paid_votes 충전 RPC (웹훅에서 호출)
CREATE OR REPLACE FUNCTION fulfill_payment_order(
  p_order_id UUID,
  p_provider_payment_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_order payment_orders%ROWTYPE;
  v_profile profiles%ROWTYPE;
BEGIN
  -- 주문 조회 + 잠금
  SELECT * INTO v_order FROM payment_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'order_not_found');
  END IF;

  -- 이미 처리된 주문 (멱등)
  IF v_order.status = 'fulfilled' THEN
    RETURN jsonb_build_object('success', TRUE, 'already_fulfilled', TRUE);
  END IF;

  -- paid 상태만 fulfill 가능
  IF v_order.status <> 'paid' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'invalid_status', 'current_status', v_order.status);
  END IF;

  -- 프로필 잠금
  SELECT * INTO v_profile FROM profiles WHERE id = v_order.profile_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'profile_not_found');
  END IF;

  -- paid_votes 충전
  IF v_order.product_type = 'paid_votes' THEN
    UPDATE profiles
    SET paid_votes = paid_votes + v_order.product_qty
    WHERE id = v_order.profile_id;

    -- vote_balance_logs에 기록
    INSERT INTO vote_balance_logs (user_id, change_type, free_change, paid_change, free_after, paid_after, reference_id, reference_type, payment_order_id)
    VALUES (
      v_order.profile_id, 'purchase',
      0, v_order.product_qty,
      v_profile.free_votes,
      v_profile.paid_votes + v_order.product_qty,
      v_order.id, 'payment_order', v_order.id
    );

    -- user_entitlements에 기록
    INSERT INTO user_entitlements (profile_id, payment_order_id, entitlement_type, granted_qty, remaining_qty, status, consumed_at)
    VALUES (v_order.profile_id, v_order.id, 'paid_votes', v_order.product_qty, 0, 'consumed', NOW());
  END IF;

  -- 주문 상태 업데이트
  UPDATE payment_orders
  SET status = 'fulfilled',
      provider_payment_id = p_provider_payment_id,
      fulfilled_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', TRUE, 'paid_votes_added', v_order.product_qty);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 환불 처리 RPC
CREATE OR REPLACE FUNCTION refund_payment_order(
  p_order_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_order payment_orders%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_refund_qty INTEGER;
BEGIN
  SELECT * INTO v_order FROM payment_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'order_not_found');
  END IF;

  IF v_order.status = 'refunded' THEN
    RETURN jsonb_build_object('success', TRUE, 'already_refunded', TRUE);
  END IF;

  IF v_order.status NOT IN ('fulfilled', 'refund_pending') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'invalid_status');
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = v_order.profile_id FOR UPDATE;

  -- 환불 가능 수량 = MIN(구매량, 현재 paid_votes)
  v_refund_qty := LEAST(v_order.product_qty, v_profile.paid_votes);

  UPDATE profiles
  SET paid_votes = paid_votes - v_refund_qty
  WHERE id = v_order.profile_id;

  INSERT INTO vote_balance_logs (user_id, change_type, free_change, paid_change, free_after, paid_after, reference_id, reference_type, payment_order_id)
  VALUES (
    v_order.profile_id, 'refund',
    0, -v_refund_qty,
    v_profile.free_votes,
    v_profile.paid_votes - v_refund_qty,
    v_order.id, 'refund', v_order.id
  );

  UPDATE user_entitlements
  SET status = 'revoked'
  WHERE payment_order_id = p_order_id;

  UPDATE payment_orders
  SET status = 'refunded', updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', TRUE, 'refunded_qty', v_refund_qty);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC 권한: fulfill/refund는 service_role만 (웹훅 전용)
REVOKE EXECUTE ON FUNCTION fulfill_payment_order FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION refund_payment_order FROM PUBLIC;
