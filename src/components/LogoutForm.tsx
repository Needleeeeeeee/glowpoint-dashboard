import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "./ui/dropdown-menu";
import { logout } from "@/actions";

const LogoutForm = () => {
  return (
    <form action={logout}>
      <DropdownMenuItem variant="destructive" asChild>
        <button type="submit" className="w-full flex items-center">
          <LogOut className="h-[1.2rem] w-[1.2re.] mr-2" />
          Logout
        </button>
      </DropdownMenuItem>
    </form>
  );
};

export default LogoutForm;
