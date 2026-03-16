-- game_rules anon READ 허용 (UI 문구 동적화를 위해 비인증 사용자도 읽어야 함)
-- 민감 정보 없음 (공개 게임 설정값)
CREATE POLICY "game_rules_select_anon" ON public.game_rules
  FOR SELECT USING (true);
