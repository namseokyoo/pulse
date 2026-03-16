-- profiles에 consented_at 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ;

-- 기존 회원은 이미 동의한 것으로 간주 (localStorage 기반으로 이미 동의했으므로)
UPDATE profiles SET consented_at = created_at WHERE consented_at IS NULL;
