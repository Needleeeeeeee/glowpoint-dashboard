import { requestPasswordReset } from "@/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-primary-foreground rounded-3xl p-6 w-96">
        <h1 className="text-2xl font-bold text-center mb-2">
          Forgot Password
        </h1>
        <p className="text-muted-foreground text-center text-sm mb-6">
          Enter your email to receive a password reset link.
        </p>
        {searchParams?.message ? (
          <div className="text-center p-4 mb-4 text-sm text-green-500 bg-green-500/10 rounded-md">
            <p>{searchParams.message}</p>
            <Link href="/login" className="font-bold underline mt-2 inline-block">
              Back to Login
            </Link>
          </div>
        ) : (
          <form action={requestPasswordReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                required
              />
            </div>
            <Button type="submit" className="w-full">Send Reset Link</Button>
          </form>
        )}
      </div>
    </div>
  );
}
