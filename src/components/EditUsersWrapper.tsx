"use client";

import EditUsers from "./EditUsers";
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type UserProfile = {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  isAdmin: boolean | null;
};

const EditUsersWrapper = ({ userToEdit }: { userToEdit: UserProfile }) => {
  return (
    <SheetContent className="p-0 flex flex-col h-full overflow-hidden">
      <div className="p-6 pb-4 border-b flex-shrink-0">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold">
            Edit {userToEdit.username}
          </SheetTitle>
          <SheetDescription className="text-sm">
            Make changes to the user profile here. Click update when you're done.
          </SheetDescription>
        </SheetHeader>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-6">
          <EditUsers userProfile={userToEdit} />
        </div>
      </div>
    </SheetContent>
  );
};

export default EditUsersWrapper;
