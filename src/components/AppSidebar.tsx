import {
  Calendar,
  ChevronUp,
  DollarSign,
  Home,
  Settings,
  User,
  User2,
  WandSparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "./ui/sidebar";
import Link from "next/link";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import LogoutForm from "./LogoutForm";
import { createClient } from "@/utils/supabase/server";
import type { User as SupabaseUser } from "@supabase/auth-js";

const AppSidebar = async ({ user }: { user: SupabaseUser | null }) => {
  let profile: { username: string | null; isAdmin: boolean | null } | null =
    null;

  if (user) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("Profiles")
      .select("username, isAdmin")
      .eq("id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching sidebar profile:", error.message);
    }
    profile = data;
  }

  const UserName = profile?.username;
  const items = [
    { title: "Home", url: "/home", icon: Home },
    { title: "Payments", url: "/payments", icon: DollarSign },
    { title: "Services", url: `/services`, icon: WandSparkles },
    { title: "Calendar", url: "/calendar", icon: Calendar },
  ];
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/home">
                <Image src="/Logo.png" alt="logo" width={50} height={45} />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {profile?.isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/users">
                      <User />
                      <span>Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem key="Settings">
                <SidebarMenuButton asChild>
                  <Link href={`/users/${UserName}`}>
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User2 /> {UserName} <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={20}>
                <Link href={`/users/${UserName}`}>
                  <DropdownMenuItem>
                    <User className="h-[1.2 rem] w-[1.2 rem] mr-2" />
                    Profile
                  </DropdownMenuItem>
                </Link>
                <LogoutForm />
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
