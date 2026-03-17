-- 기존 중복 데이터 확인 쿼리 (적용 전 확인)
-- SELECT nickname, COUNT(*) FROM profiles GROUP BY nickname HAVING COUNT(*) > 1;

ALTER TABLE profiles ADD CONSTRAINT uq_nickname UNIQUE (nickname);
