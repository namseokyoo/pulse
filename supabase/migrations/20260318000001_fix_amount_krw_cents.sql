-- 기존 잘못 저장된 amount_krw를 상품 가격 기준으로 보정
UPDATE payment_orders
SET amount_krw = CASE
    WHEN product_qty = 10 THEN 2000
    WHEN product_qty = 50 THEN 9000
    WHEN product_qty = 100 THEN 16000
    ELSE ROUND(amount_krw / 100)
  END,
  updated_at = now()
WHERE amount_krw > 100000;
