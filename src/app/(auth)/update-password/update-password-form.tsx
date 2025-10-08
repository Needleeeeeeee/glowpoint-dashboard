"use client";

import { updateUserPassword } from "@/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

const initialState = {
  message: "",
  error: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Updating..." : "Update Password"}
    </Button>
  );
}

export default function UpdatePasswordForm() {
  const [state, formAction] = useActionState(updateUserPassword, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-primary-foreground rounded-3xl p-6 w-96">
        <h1 className="text-2xl font-bold text-center mb-2">
          Update Your Password
        </h1>
        <p className="text-muted-foreground text-center text-sm mb-6">
          Enter and confirm your new password below.
        </p>
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="password">New Password</label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              className="mt-1"
            />
          </div>
          <SubmitButton />
          {state?.message && (
            <p
              className={`text-sm text-center mt-4 ${
                state.error ? "text-red-500" : "text-green-500"
              }`}
            >
              {state.message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
