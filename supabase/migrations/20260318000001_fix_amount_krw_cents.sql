-- 기존 잘못 저장된 amount_krw를 100으로 나누어 보정
UPDATE payment_orders
SET amount_krw = ROUND(amount_krw / 100),
    updated_at = now()
WHERE amount_krw > 100000;
