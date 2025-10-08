import { verifyMfaAndCompleteLogin } from "@/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Verify2FAPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-primary-foreground rounded-3xl p-6 w-96">
        <h1 className="text-2xl font-bold text-center mb-2">
          Two-Factor Authentication
        </h1>
        <p className="text-muted-foreground text-center text-sm mb-6">
          Enter the code from your authenticator app.
        </p>
        <form action={verifyMfaAndCompleteLogin} className="space-y-4">
          <div>
            <label htmlFor="code" className="sr-only">
              Verification Code
            </label>
            <Input
              id="code"
              name="code"
              type="text"
              placeholder="123456"
              required
              pattern="\d{6}"
              className="mt-1"
            />
          </div>
          {searchParams?.error && (
            <p className="text-sm text-destructive">{searchParams.error}</p>
          )}
          <Button type="submit" className="w-full">
            Verify
          </Button>
        </form>
      </div>
    </div>
  );
}
