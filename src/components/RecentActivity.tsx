"use client";

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { UserActivityPopover } from "./UserActivityPopover";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

type Profile = {
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
} | null;

type Activity = {
  id: string;
  date_created: string;
  claimed_service: string | null;
  Name: string | null;
  Profiles: Profile;
};

export function RecentActivity() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('Appointments')
        .select(`
          id,
          date_created,
          claimed_service,
          Name,
          Profiles!inner (
            username,
            bio,
            avatar_url
          )
        `)
        .eq('status', 'assigned')
        .not('claimed_by_id', 'is', null)
        .order('date_created', { ascending: false })
        .limit(50); // Fetch a larger set for client-side filtering

      if (error) {
        console.error("Error fetching recent activity:", error);
        setError("Could not load recent activity.");
      } else {
        setAllActivities(data || []);
      }
      setLoading(false);
    };

    fetchActivities();
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredActivities(allActivities.slice(0, 10));
      return;
    }

    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = allActivities.filter(activity => {
      const profile = Array.isArray(activity.Profiles) ? activity.Profiles[0] : activity.Profiles;
      const username = profile?.username?.toLowerCase() || '';
      const customerName = activity.Name?.toLowerCase() || '';
      const service = activity.claimed_service?.toLowerCase() || '';

      return (
        username.includes(lowercasedQuery) ||
        customerName.includes(lowercasedQuery) ||
        service.includes(lowercasedQuery)
      );
    });

    setFilteredActivities(filtered.slice(0, 10));
  }, [searchQuery, allActivities]);

  if (loading) {
    return <p className="text-sm text-muted-foreground mt-4">Loading activity...</p>;
  }

  if (error) {
    return <p className="text-sm text-muted-foreground mt-4">{error}</p>;
  }

  if (filteredActivities.length === 0) {
    return <p className="text-sm text-muted-foreground mt-4">No recent activity found for the current search.</p>;
  }

  return (
    <div className="space-y-4">
      {filteredActivities.map((activity) => {
        const profile = Array.isArray(activity.Profiles) ? activity.Profiles[0] : activity.Profiles;
        const username = profile?.username ?? 'An employee';
        const customerName = activity.Name ?? 'a client';
        const service = activity.claimed_service ?? 'a service';
        const activityDate = new Date(activity.date_created);

        return (
          <UserActivityPopover key={activity.id} user={profile}>
            <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="size-9 border">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-sm">
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{username}</span> claimed an appointment for <span className="font-medium text-primary">{customerName}</span>.
                    </p>
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      <p><strong>Service:</strong> <Badge variant="secondary">{service}</Badge></p>
                      <p><strong>When:</strong> {format(activityDate, "MMM d, yyyy")} ({formatDistanceToNow(activityDate, { addSuffix: true })})</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </UserActivityPopover>
        );
      })}
    </div>
  );
}
