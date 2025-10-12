import { Badge } from "@/components/ui/badge";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import EditUsersWrapper from "@/components/EditUsersWrapper";
import { createClient } from "@/utils/supabase/server";
import EditDetailsWrapper from "@/components/EditDetailsWrapper";

export default async function SingleUserPage({
  params,
}: {
  params: { username: string };
}) {
  const { username } = params;
  const supabase = await createClient();

  // Fetch the logged-in user and the viewed profile concurrently
  const [
    {
      data: { user: loggedInUser },
    },
    { data: viewedUserProfile, error: profileError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("Profiles")
      .select("id, username, email, phone, location, isAdmin, bio, avatar_url")
      .eq("username", username)
      .single(),
  ]);

  if (profileError || !viewedUserProfile) {
    return <div>User not found.</div>;
  }

  // Check if the currently logged-in user is an admin
  const { data: currentUserProfile } = loggedInUser
    ? await supabase
        .from("Profiles")
        .select("isAdmin")
        .eq("id", loggedInUser.id)
        .single()
    : { data: null };
  const isCurrentUserAdmin = currentUserProfile?.isAdmin || false;

  // Fetch MFA factors for the logged-in user
  const { data: mfaData } = await supabase.auth.mfa.listFactors();
  const factors = mfaData?.all ?? [];

  const isOwnProfile = loggedInUser?.id === viewedUserProfile.id;

  // An admin can edit any profile, or a user can edit their own.
  const canEdit = isOwnProfile || isCurrentUserAdmin;
  console.log("User:", loggedInUser?.id);
  console.log("Viewed Profile:", viewedUserProfile.id);
  console.log("Is Own Profile:", isOwnProfile);
  console.log("Is Admin:", isCurrentUserAdmin);
  console.log("Can Edit:", canEdit);

  return (
    <div className="min-h-screen p-4">
      <div className="mt-4 flex flex-col xl:flex-row gap-8 items-stretch min-h-[calc(100vh-6rem)]">
        <div className="w-full lg:w-1/3">
          <div className="bg-primary-foreground p-4 rounded-lg h-full flex flex-col min-h-[400px] xl:min-h-full">
            <div className="flex items-center justify-between">
              <h1 className="font-bold mb-2 text-lg md:text-xl xl:text-2xl">
                User Information
              </h1>
              {canEdit && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button>Edit User</Button>
                  </SheetTrigger>
                  <EditUsersWrapper userToEdit={viewedUserProfile} />
                </Sheet>
              )}
            </div>
            <div className="space-y-6 mt-6 flex-1 justify-center flex flex-col">
              <div className="flex items-center gap-3">
                <span className="font-bold text-base md:text-lg xl:text-xl">
                  Username:
                </span>
                <span className="text-base md:text-lg xl:text-xl">
                  {viewedUserProfile.username}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-base md:text-lg xl:text-xl">
                  Email:
                </span>
                <span className="text-base md:text-lg xl:text-xl break-all">
                  {viewedUserProfile.email}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-base md:text-lg xl:text-xl">
                  Phone:
                </span>
                <span className="text-base md:text-lg xl:text-xl">
                  {viewedUserProfile.phone}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-base md:text-lg xl:text-xl">
                  Location:
                </span>
                <span className="text-base md:text-lg xl:text-xl">
                  {viewedUserProfile.location}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-base md:text-lg xl:text-xl">
                  Role:
                </span>
                <Badge className="text-sm md:text-base xl:text-lg px-3 py-1">
                  {viewedUserProfile.isAdmin ? "Admin" : "Employee"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-2/3">
          <div className="bg-primary-foreground p-4 rounded-lg space-y-2 h-full flex flex-col min-h-[400px] xl:min-h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-16 md:size-20 xl:size-24">
                  <AvatarImage
                    src={viewedUserProfile.avatar_url ?? undefined}
                  />
                  <AvatarFallback className="text-lg md:text-xl xl:text-2xl">
                    {viewedUserProfile.username?.charAt(0).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <h1 className="font-semibold text-2xl md:text-3xl xl:text-4xl">
                  {viewedUserProfile.username}
                </h1>
              </div>
              {canEdit && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">Edit Details</Button>
                  </SheetTrigger>
                  <EditDetailsWrapper
                    userProfile={viewedUserProfile}
                    factors={factors}
                  />
                </Sheet>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center relative pt-12">
              <span className="absolute top-0 left-0 bg-muted px-3 py-1.5 text-lg font-semibold text-gray-300 rounded-br-lg rounded-tl-lg ml-5">
                Bio:
              </span>
              {viewedUserProfile.bio ? (
                <blockquote className="relative max-w-prose px-8 text-center text-lg italic leading-relaxed text-muted-foreground md:text-xl xl:text-2xl">
                  <span className="absolute -left-2 -top-2 select-none font-serif text-6xl text-muted-foreground/20">
                    “
                  </span>
                  {viewedUserProfile.bio}
                  <span className="absolute -bottom-6 -right-2 select-none font-serif text-6xl text-muted-foreground/20">
                    ”
                  </span>
                </blockquote>
              ) : (
                <p className="text-lg md:text-xl xl:text-2xl text-muted-foreground text-center leading-relaxed max-w-prose">
                  This user has not set a bio yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
