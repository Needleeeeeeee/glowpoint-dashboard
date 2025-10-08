import { User } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "./ui/sidebar";
import LogoutForm from "./LogoutForm";
import ThemeButtons from "./ThemeButtons";
import { createClient } from "@/utils/supabase/server";
import type { User as SupabaseUser } from "@supabase/auth-js";

const Navbar = async ({ user }: { user: SupabaseUser | null }) => {
  let profile: { username: string | null; avatar_url: string | null } | null = null;

  if (user) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("Profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();

    if (error && error.code !== "PGRST116") { // Don't log error if profile doesn't exist yet
      console.error("Error fetching navbar profile:", error.message);
    }
    profile = data;
  }

  const UserName = profile?.username;

  return (
    <nav className="p-4 items-center flex justify-between sticky top-0 bg-background z-10">
      <SidebarTrigger />
      <div className="flex items-center gap-4">
        <Link href="/home">Dashboard</Link>

        <ThemeButtons />

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="hover:cursor-pointer">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback>
                {UserName?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={10}>
            <DropdownMenuLabel>{UserName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href={`/users/${UserName}`}>
              <DropdownMenuItem>
                <User className="h-[1.2rem] w-[1.2rem] mr-2" />
                Profile
              </DropdownMenuItem>
            </Link>
            <LogoutForm />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default Navbar;
