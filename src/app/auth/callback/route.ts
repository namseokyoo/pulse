import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const isLocalEnv = process.env.NODE_ENV === "development";
  // NEXT_PUBLIC_SITE_URL을 최우선으로 사용 (커스텀 도메인 보장)
  // x-forwarded-host는 Vercel 내부 도메인을 반환할 수 있어 사용하지 않음
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  let redirectUrl: string;
  if (isLocalEnv) {
    redirectUrl = `${origin}${next}`;
  } else if (siteUrl) {
    redirectUrl = `${siteUrl}${next}`;
  } else {
    redirectUrl = `${origin}${next}`;
  }

  if (code) {
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("consented_at")
          .eq("id", user.id)
          .single();

        if (!profile?.consented_at) {
          let onboardingUrl: string;
          if (isLocalEnv) {
            onboardingUrl = `${origin}/onboarding`;
          } else if (siteUrl) {
            onboardingUrl = `${siteUrl}/onboarding`;
          } else {
            onboardingUrl = `${origin}/onboarding`;
          }

          const onboardingResponse = NextResponse.redirect(onboardingUrl);
          response.cookies.getAll().forEach(({ name, value, ...options }) => {
            onboardingResponse.cookies.set(name, value, options);
          });

          return onboardingResponse;
        }
      }

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
