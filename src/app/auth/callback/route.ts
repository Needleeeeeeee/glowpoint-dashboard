import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If `next` is provided, it's a password reset flow - redirect there
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      // Otherwise, it's a Google OAuth flow - redirect to home
      return NextResponse.redirect(`${origin}/home`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?message=Could not authenticate user`);
}
