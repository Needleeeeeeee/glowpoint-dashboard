import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Code exchange error:", error);
    }
    if (!error) {
      // On successful code exchange, redirect to the password update page.
      return NextResponse.redirect(`${origin}/update-password`);
    }
  }

  // If there's an error or no code, redirect to login with an error message.
  return NextResponse.redirect(
    `${origin}/login?message=Could not verify password reset token. Please try again.`
  );
}
