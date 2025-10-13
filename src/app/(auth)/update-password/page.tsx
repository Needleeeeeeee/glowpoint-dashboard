import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import UpdatePasswordForm from "./update-password-form";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login?message=Your password reset link is invalid or has expired. Please try again."
    );
  }

  const { data: mfaData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // If MFA is enabled but the current session is not AAL2, redirect to verify
  if (mfaData?.nextLevel === "aal2" && mfaData?.currentLevel !== "aal2") {
    redirect("/login/verify-2fa?next=/update-password");
  }

  return <UpdatePasswordForm />;
}
