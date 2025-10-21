"use client";

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect, useTransition, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Card, CardContent } from "./ui/card";
import { StarRating } from "./StarRating";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { PaginationControls } from "@/components/PaginationControls";
import { FeedbackFilter } from "./FeedbackFilter";
import { ClearFeedbackButton } from "./ClearFeedbackButton";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";
import { clearFeedback as clearFeedbackAction } from "@/actions";

const PAGE_SIZE = 4;

type Feedback = {
  id: string;
  from_user: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

export function RecentFeedback() {
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page");
  const ratingParam = searchParams.get('rating');
  const hasCommentParam = searchParams.get('has_comment');
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const page = pageParam ? parseInt(pageParam, 10) : 1;

  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const filters = useMemo(() => {
    return { page, rating: ratingParam, hasComment: hasCommentParam, from: fromParam, to: toParam };
  }, [page, ratingParam, hasCommentParam, fromParam, toParam]);

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      const supabase = createClient();
      const ratingFilter = filters.rating ? parseInt(filters.rating, 10) : null;
      const hasCommentFilter = filters.hasComment === 'true';

      const from = (filters.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Debug: log the filters being applied
      console.log('Filters:', { ratingFilter, hasCommentFilter, from: filters.from, to: filters.to, page: filters.page });

      let query = supabase
        .from("Feedback")
        .select("id, from_user, rating, comment, created_at", { count: "exact" })
        .order("created_at", { ascending: false });

      // Try without is_cleared filter first to see if that's the issue
      // query = query.eq("is_cleared", false);

      if (ratingFilter && ratingFilter >= 1 && ratingFilter <= 5) {
        query = query.eq('rating', ratingFilter);
      }

      if (hasCommentFilter) {
        query = query.not('comment', 'is', null).neq('comment', '');
      }

      if (filters.from) {
        query = query.gte('created_at', new Date(filters.from).toISOString());
      }

      if (filters.to) {
        query = query.lte('created_at', new Date(filters.to).toISOString());
      }

      const { data, error: fetchError, count: fetchCount } = await query.range(from, to);

      // Debug: log the results
      console.log('Query results:', { data, error: fetchError, count: fetchCount });

      if (fetchError) {
        console.error("Error fetching feedback:", fetchError);
        setError("Could not load feedback.");
      } else {
        setAllFeedback(data || []);
        setCount(fetchCount);
      }
      setLoading(false);
    };

    fetchFeedback();
  }, [filters]);


  const handleClear = (id: string | "all") => {
    startTransition(async () => {
      const result = await clearFeedbackAction(id === "all" ? "all" : [id]);
      if (result.error) {
        toast.error("Failed to clear feedback", { description: result.error });
      } else {
        if (id === "all") {
          setAllFeedback([]);
          setCount(0);
        } else {
          setAllFeedback((prev) => prev.filter((item) => item.id !== id));
          setCount((prev) => (prev ? prev - 1 : 0));
        }
        toast.success(`Feedback ${id === "all" ? "cleared" : "item cleared"}`);
      }
    });
  };

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return (
    <div className="h-full flex flex-col">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex-grow">
          <FeedbackFilter />
        </div>
        <div>
          <ClearFeedbackButton disabled={isPending || !allFeedback || allFeedback.length === 0} />
        </div>
      </div>

      {/* Content area */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading feedback...</p>
      ) : error ? (
        <p className="text-sm text-muted-foreground text-center py-8">{error}</p>
      ) : allFeedback.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {filters.rating || filters.hasComment || filters.from || filters.to
                ? "No feedback found for the selected filters."
                : "No recent feedback."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Feedback list */}
          <div className="flex-1 space-y-4">
            {allFeedback.map((item) => (
              <div key={item.id} className="group relative">
              <Card className="border border-border/50 hover:border-border transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={`https://api.dicebear.com/8.x/lorelei/svg?seed=${item.from_user ?? 'anonymous'}`}
                          alt={item.from_user ?? "Avatar"}
                        />
                        <AvatarFallback className="text-xs font-medium">
                          {item.from_user?.charAt(0).toUpperCase() ?? 'A'}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* User name and rating */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="font-medium text-sm truncate">
                          {item.from_user ?? "Anonymous"}
                        </p>
                        <div className="flex-shrink-0">
                          <StarRating rating={item.rating} />
                        </div>
                      </div>

                      {/* Comment */}
                      {item.comment && (
                        <div className="relative">
                          <blockquote className="text-xs text-muted-foreground border-l-2 border-muted pl-3 italic leading-relaxed">
                            "{item.comment}"
                          </blockquote>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleClear(item.id)}
                disabled={isPending}
              >
                <X className="size-4" />
              </Button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center pt-4">
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                hasNextPage={hasNextPage}
                hasPrevPage={hasPrevPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
