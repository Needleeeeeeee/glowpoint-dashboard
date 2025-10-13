"use client";

import React from "react";
    import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import EditDetailsForm from "./EditDetailsForm";
import type { Factor } from "@supabase/auth-js";

type UserProfile = {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
};

interface EditDetailsButtonProps {
  userProfile: UserProfile | null;
  factors: Factor[];
}

export default function EditDetailsButton({
  userProfile,
  factors,
}: EditDetailsButtonProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Edit Details</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Details</SheetTitle>
          <SheetDescription>
            Update your bio, profile picture, or connect accounts.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          {userProfile ? (
            <EditDetailsForm userProfile={userProfile} factors={factors} />
          ) : (
            <p className="p-4">You must be logged in to edit your profile.</p>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
