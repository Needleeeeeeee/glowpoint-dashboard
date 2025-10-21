import { ForgotPasswordForm } from "@/components/forgot-password-form";
import Link from "next/link";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-primary-foreground rounded-3xl p-6 w-96">
        <h1 className="text-2xl font-bold text-center mb-2">
          Forgot Password
        </h1>
        <p className="text-muted-foreground text-center text-sm mb-6">
          Enter your email to receive a password reset link.
        </p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
