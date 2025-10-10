import { Users, columns } from "./columns";
import { DataTable } from "./data-table";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import CreateUserForm from "@/components/CreateUserForm";

const getProfiles = async (): Promise<Users[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("Profiles")
    .select("*");

  if (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }

  if (!data) {
    return [];
  }

  const profiles: Users[] = data
    .filter((profile) => profile.id !== user?.id) // Exclude the current user
    .map((profile) => {
      const phone = profile.phone ?? "N/A";
      return {
        id: profile.id,
        username: profile.username ?? "N/A",
        email: profile.email ?? "N/A",
        phone: phone.startsWith("+63") ? `0${phone.substring(3)}` : phone,
        location: profile.location ?? "N/A",
        isAdmin: profile.isAdmin,
        is_active: profile.is_active,
      };
    });

  return profiles;
};

const UsersPage = async () => {
  const data = await getProfiles();
  return (
    <div className="w-full px-6 py-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button>Create User</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Create New User</SheetTitle>
              <SheetDescription>
                Fill in the details to create a new user profile.
              </SheetDescription>
            </SheetHeader>
            <CreateUserForm />
          </SheetContent>
        </Sheet>
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default UsersPage;
