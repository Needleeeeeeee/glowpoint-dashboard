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
      // password reset flow should NOT go through this callback.
      // If `next` is missing, it's a sign something is wrong.
      if (!next) {
        return NextResponse.redirect(
          `${origin}/login?message=Invalid callback URL. Please try the password reset process again.`
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?message=Could not authenticate user`);
}
