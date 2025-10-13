"use client";

import { useEffect, useState, useActionState } from "react";
import { enrollMfa, challengeAndVerifyMfa } from "@/actions";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function EnableMfaForm({
  setDialogOpen,
}: {
  setDialogOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [verifyState, verifyAction, isVerifyPending] = useActionState(
    challengeAndVerifyMfa,
    undefined
  );

  useEffect(() => {
    async function getEnrollmentData() {
      setIsLoading(true);
      setError(null);
      const result = await enrollMfa();
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setQrCode(result.data.qr_code);
        setFactorId(result.data.factor_id);
      }
      setIsLoading(false);
    }
    getEnrollmentData();
  }, []);

  useEffect(() => {
    if (verifyState?.success) {
      toast.success(verifyState.success);
      setDialogOpen(false);
      router.refresh();
    }
  }, [verifyState, setDialogOpen, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-center">{error}</p>;
  }

  if (!qrCode || !factorId) {
    return (
      <p className="text-destructive text-center">
        Could not load QR code. Please try again.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div dangerouslySetInnerHTML={{ __html: qrCode }} />
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Scan this with an authenticator app like Google Authenticator or Authy.
      </p>
      <form action={verifyAction} className="space-y-4">
        <input type="hidden" name="factorId" value={factorId} />
        <div>
          <label htmlFor="code">Verification Code</label>
          <Input
            id="code"
            name="code"
            type="text"
            placeholder="123456"
            required
            pattern="\d{6}"
            className="mt-1"
            disabled={isVerifyPending}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isVerifyPending}>
          {isVerifyPending ? "Verifying..." : "Verify and Enable"}
        </Button>
        {verifyState?.error && (
          <p className="text-sm text-destructive">{verifyState.error}</p>
        )}
      </form>
    </div>
  );
}
