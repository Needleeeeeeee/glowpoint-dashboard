import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // This should not happen if the user is coming from a successful OAuth login,
    // but as a safeguard, redirect to login.
    return NextResponse.redirect(new URL("/login?message=Authentication required.", request.url));
  }

  // Check if the user has a profile in the public.Profiles table
  const { data: profile, error } = await supabase
    .from("Profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // If there's an error or no profile, sign the user out and redirect to login with an error message.
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?message=Your account is not registered. Please contact an administrator.", request.url));
  }

  // If a profile exists, redirect to the home page.
  return NextResponse.redirect(new URL("/home", request.url));
}
