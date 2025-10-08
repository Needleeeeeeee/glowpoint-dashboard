import AppSidebar from "@/components/AppSidebar";
import Navbar from "@/components/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="w-full min-h-screen flex">
        <AppSidebar user={user} />
        <main className="flex-1 w-full overflow-x-hidden">
          <Navbar user={user} />
          <div className="w-full">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
