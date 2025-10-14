"use client";

import * as React from "react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";

type UserProfile = {
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
} | null;

interface UserActivityPopoverProps {
  children: React.ReactNode;
  user: UserProfile;
  popoverContentProps?: Partial<React.ComponentPropsWithoutRef<typeof PopoverContent>>;
}

export function UserActivityPopover({ children, user, popoverContentProps }: UserActivityPopoverProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (!user) {
    return <>{children}</>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-72"
        side={popoverContentProps?.side ?? (isMobile ? "top" : "right")}
        align={popoverContentProps?.align ?? (isMobile ? "center" : "start")}
        sideOffset={popoverContentProps?.sideOffset}
        alignOffset={popoverContentProps?.alignOffset ?? (isMobile ? 0 : 10)}
      >
        <div className="flex items-center gap-4">
          <Avatar className="size-12">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback>{user.username?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
          </Avatar>
          <div className="grid gap-0.5">
            <CardTitle className="text-base">{user.username ?? 'Anonymous'}</CardTitle>
            <CardDescription className="text-xs line-clamp-3">{user.bio ?? 'No bio yet.'}</CardDescription>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
