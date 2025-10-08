import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import UpdatePasswordForm from "./update-password-form";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // This is the crucial check. If the session from the password reset
    // is not available, we redirect to login.
    redirect(
      "/login?message=Your password reset link is invalid or has expired. Please try again."
    );
  }

  return <UpdatePasswordForm />;
}
