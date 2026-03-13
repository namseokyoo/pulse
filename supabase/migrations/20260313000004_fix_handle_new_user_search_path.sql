-- Fix: handle_new_user() 함수에 search_path 명시
-- 원인: SECURITY DEFINER 함수가 Supabase Auth 컨텍스트에서 실행될 때
--       기본 search_path에 public이 포함되지 않아 profiles 테이블을 찾지 못함
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, public.generate_random_nickname())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
