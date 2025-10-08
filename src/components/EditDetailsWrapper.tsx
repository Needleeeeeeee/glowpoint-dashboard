import { createClient } from "@/utils/supabase/server";
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import EditDetailsForm from "./EditDetailsForm";
import type { Factor } from "@supabase/auth-js";

type UserProfile = {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export default async function EditDetailsWrapper() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <SheetContent>
        <p>You must be logged in to edit your profile.</p>
      </SheetContent>
    );
  }

  const { data: userProfile, error } = await supabase
    .from("Profiles")
    .select("id, username, bio, avatar_url, email")
    .eq("email", user.email)
    .single();

  if (error || !userProfile) {
    return (
      <SheetContent>
        <p>Could not load profile data.</p>
      </SheetContent>
    );
  }

  const { data: mfaData } = await supabase.auth.mfa.listFactors();
  const factors = mfaData?.all ?? [];

  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Edit Details</SheetTitle>
        <SheetDescription>
          Update your bio, profile picture, or connect accounts.
        </SheetDescription>
      </SheetHeader>
      <EditDetailsForm userProfile={userProfile as UserProfile} factors={factors} />
    </SheetContent>
  );
}
