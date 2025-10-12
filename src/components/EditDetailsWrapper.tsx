"use client"
import { createClient } from "@/utils/supabase/server";
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import EditDetailsForm from "./EditDetailsForm";
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

const EditDetailsWrapper = ({ userProfile, factors }: { userProfile: UserProfile,factors: Factor[] }) =>  {

  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Edit Details</SheetTitle>
        <SheetDescription>
          Update your bio, profile picture, or connect accounts.
        </SheetDescription>
      </SheetHeader>
      <EditDetailsForm userProfile={userProfile} factors={factors} />
    </SheetContent>
  );
}
export default EditDetailsWrapper;
