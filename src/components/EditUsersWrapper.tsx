import EditUsers from "./EditUsers";
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "./ui/scroll-area";

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
      <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
        <EditUsers userProfile={userToEdit} />
      </ScrollArea>
    </SheetContent>
  );
};

export default EditUsersWrapper;
