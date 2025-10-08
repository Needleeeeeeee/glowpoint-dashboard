"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateUserProfileDetails, linkGoogleAccount, unenrollMfa } from "@/actions";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EnableMfaForm } from "./EnableMfaForm";
import type { Factor } from "@supabase/auth-js";

type EditDetailsFormProps = {
  userProfile: {
    id: string;
    username: string | null;
    bio: string | null;
    avatar_url: string | null;
  };
  factors: Factor[];
};

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 48 48"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.804 12.12C34.553 8.246 29.692 6 24 6C12.955 6 4 14.955 4 26s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039L38.804 12.12C34.553 8.246 29.692 6 24 6C16.318 6 9.656 10.019 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 46c5.952 0 11.22-1.992 14.918-5.416l-6.52-4.818C29.932 39.123 27.235 40 24 40c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l6.571-4.819C38.961 12.01 34.553 8.246 29.692 6 24 6 16.318 6 9.656 10.019 6.306 14.691 4 20.165 4 26s2.306 11.309 6.306 15.309z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l6.571-4.819C38.961 12.01 34.553 8.246 29.692 6 24 6 16.318 6 9.656 10.019 6.306 14.691 4 20.165 4 26s2.306 11.309 6.306 15.309C9.656 39.981 16.318 44 24 44c5.952 0 11.22-1.992 14.918-5.416l-6.52-4.818C29.932 39.123 27.235 40 24 40c-4.473 0-8.284-2.686-10.039-6.417l14.64-1.1c.246.5.477.999.693 1.482z"
      />
    </svg>
  );
}

export default function EditDetailsForm({ userProfile, factors }: EditDetailsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateUserProfileDetails,
    undefined
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    userProfile.avatar_url
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (state?.success) {
      // You might want to close the sheet or show a success message.
    }
  }, [state]);

  const verifiedFactor = factors.find((f) => f.status === "verified");

  return (
    <div className="space-y-6 pt-6 px-4">
      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="avatar">Profile Picture</Label>
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={avatarPreview ?? undefined} />
              <AvatarFallback>
                {userProfile.username?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <Input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/png, image/jpeg"
              onChange={handleAvatarChange}
              className="flex-1"
              disabled={isPending}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            name="bio"
            placeholder="Tell us a little bit about yourself"
            defaultValue={userProfile.bio ?? ""}
            className="min-h-[100px]"
            disabled={isPending}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.success && (
          <p className="text-sm text-green-500">{state.success}</p>
        )}
      </form>

      <Separator />

      <div className="space-y-4">
        <h3 className="font-semibold">Two-Factor Authentication</h3>
        {verifiedFactor ? (
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">2FA is enabled.</p>
            <form action={unenrollMfa}>
              <input type="hidden" name="factorId" value={verifiedFactor.id} />
              <Button variant="destructive" size="sm">Disable</Button>
            </form>
          </div>
        ) : (
          <Dialog open={mfaDialogOpen} onOpenChange={setMfaDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">Enable 2FA</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                <DialogDescription>
                  Scan the QR code with your authenticator app, then enter the
                  code to verify.
                </DialogDescription>
              </DialogHeader>
              <EnableMfaForm setDialogOpen={setMfaDialogOpen} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="font-semibold">Linked Accounts</h3>
        <form action={linkGoogleAccount}>
          <Button variant="outline" className="w-full flex items-center gap-2">
            <GoogleIcon />
            Connect with Google
          </Button>
        </form>
      </div>
    </div>
  );
}
