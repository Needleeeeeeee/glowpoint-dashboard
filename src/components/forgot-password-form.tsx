"use client";

import { requestPasswordReset } from "@/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useActionState } from "react";
import { useEffect, useRef } from "react";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, {
    error: undefined,
    success: undefined
  });

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state?.success]);

  return (
    <>
      {state?.success ? (
        <div className="text-center p-4 mb-4 text-sm text-green-500 bg-green-500/10 rounded-md">
          <p>{state.success}</p>
          <Link href="/login" className="font-bold underline mt-2 inline-block">
            Back to Login
          </Link>
        </div>
      ) : (
        <>
          {state?.error && (
            <div className="text-center p-4 mb-4 text-sm text-red-500 bg-red-500/10 rounded-md">
              {state.error}
            </div>
          )}
          <form ref={formRef} action={formAction} className="space-y-4">
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
            <Button type="submit" className="w-full">
              Send Reset Link
            </Button>
          </form>
        </>
      )}
    </>
  );
}
