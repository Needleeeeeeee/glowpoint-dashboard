"use client";

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect, useTransition, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { UserActivityPopover } from "./UserActivityPopover";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { clearActivity as clearActivityAction } from "@/actions";
import { toast } from "sonner";
import { ActivitySearch } from "./ActivitySearch";

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
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dateRange = useMemo(() => {
    return { from: fromParam, to: toParam };
  }, [fromParam, toParam]);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      const supabase = createClient();
      let query = supabase
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
        .eq('is_cleared', false)
        .order('date_created', { ascending: false });

      if (dateRange.from) {
        query = query.gte('date_created', new Date(dateRange.from).toISOString());
      }
      if (dateRange.to) {
        query = query.lte('date_created', new Date(dateRange.to).toISOString());
      }

      query = query.limit(50); // Fetch up to 50 for client-side filtering

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching recent activity:", error);
        setError("Could not load recent activity.");
      } else {
        setAllActivities(data || []);
      }
      setLoading(false);
    };

    fetchActivities();
  }, [dateRange]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredActivities(allActivities);
      return;
    }

    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = allActivities.filter(activity => {
      const profile = Array.isArray(activity.Profiles) ? activity.Profiles[0] : activity.Profiles;
      const username = profile?.username?.toLowerCase() || '';
      const customerName = activity.Name?.toLowerCase() || '';
      const service = activity.claimed_service?.toLowerCase() || '';
      const activityDate = activity.date_created ? format(parseISO(activity.date_created), "MMM d, yyyy").toLowerCase() : '';

      return (
        username.includes(lowercasedQuery) ||
        customerName.includes(lowercasedQuery) ||
        service.includes(lowercasedQuery) ||
        activityDate.includes(lowercasedQuery)
      );
    });

    setFilteredActivities(filtered);
  }, [searchQuery, allActivities]);

  const handleClear = (id: string | "all") => {
    startTransition(async () => {
      const result = await clearActivityAction(id === "all" ? "all" : [id]);
      if (result.error) {
        toast.error("Failed to clear activity", { description: result.error });
      } else {
        if (id === "all") {
          setAllActivities([]);
          setFilteredActivities([]);
        } else {
          setAllActivities((prev) => prev.filter((act) => act.id !== id));
          setFilteredActivities((prev) => prev.filter((act) => act.id !== id));
        }
        toast.success(`Activity ${id === "all" ? "cleared" : "cleared"}`);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>A feed of recent appointment claims.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClear("all")}
            disabled={isPending || allActivities.length === 0}
          >
            Clear All
          </Button>
        </div>
        <ActivitySearch />
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading activity...</p>
        ) : error ? (
          <p className="text-sm text-muted-foreground text-center py-8">{error}</p>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {searchQuery || dateRange.from || dateRange.to
                ? "No activities match your search criteria."
                : "No recent activity."}
            </p>
            {(searchQuery || dateRange.from || dateRange.to) && allActivities.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Try adjusting your filters or search query.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity) => {
              const profile = Array.isArray(activity.Profiles) ? activity.Profiles[0] : activity.Profiles;
              const username = profile?.username ?? 'An employee';
              const customerName = activity.Name ?? 'a client';
              const service = activity.claimed_service ?? 'a service';
              const activityDate = new Date(activity.date_created);

              return (
                <div key={activity.id} className="group relative">
                  <UserActivityPopover user={profile}>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleClear(activity.id)}
                    disabled={isPending}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
