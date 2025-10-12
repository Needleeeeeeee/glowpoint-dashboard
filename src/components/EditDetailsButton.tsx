"use client";

import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import EditDetailsWrapper from "@/components/EditDetailsWrapper";
import { Factor } from "@supabase/auth-js";

type UserProfile = {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  isAdmin: boolean;
  bio: string | null;
  avatar_url: string | null;
};

interface EditDetailsButtonProps {
  userProfile: UserProfile;
  factors: Factor[];
}

export default function EditDetailsButton({ userProfile, factors }: EditDetailsButtonProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Edit Details</Button>
      </SheetTrigger>
      <EditDetailsWrapper userProfile={userProfile} factors={factors} />
    </Sheet>
  );
}
