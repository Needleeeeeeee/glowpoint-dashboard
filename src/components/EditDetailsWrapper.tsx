"use client";

import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import EditDetailsForm from "./EditDetailsForm";
import type { Factor } from "@supabase/auth-js";

type UserProfile = {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
};

interface EditDetailsWrapperProps {
  userProfile: UserProfile | null;
  factors: Factor[];
}

export default function EditDetailsWrapper({
  userProfile,
  factors,
}: EditDetailsWrapperProps) {
  if (!userProfile) {
    return (
      <SheetContent>
        <p>You must be logged in to edit your profile.</p>
      </SheetContent>
    );
  }

  return (
    <SheetContent className="p-0">
      <SheetHeader className="p-6">
        <SheetTitle>Edit Details</SheetTitle>
        <SheetDescription>
          Update your bio, profile picture, or connect accounts.
        </SheetDescription>
      </SheetHeader>
      <ScrollArea className="h-[calc(100vh-8rem)] p-6">
        <EditDetailsForm
          userProfile={userProfile as UserProfile}
          factors={factors}
        />
      </ScrollArea>
    </SheetContent>
  );
}
