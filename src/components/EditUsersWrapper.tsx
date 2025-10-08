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

const EditUsersWrapper = async ({ userToEdit }: { userToEdit: UserProfile }) => {
  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Edit {userToEdit.username}</SheetTitle>
        <SheetDescription>
          Make changes to the user profile here. Click update when you're done.
        </SheetDescription>
      </SheetHeader>
      <EditUsers userProfile={userToEdit} />
    </SheetContent>
  );
};

export default EditUsersWrapper;
