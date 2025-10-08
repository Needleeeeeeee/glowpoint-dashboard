import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "./ui/card";
import { StarRating } from "./StarRating";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { PaginationControls } from "@/components/PaginationControls";
import { FeedbackFilter } from "./FeedbackFilter";

const PAGE_SIZE = 4;

export async function RecentFeedback({
  page: pageParam,
  rating: ratingParam,
  hasComment: hasCommentParam,
}: {
  page?: string;
  rating?: string;
  hasComment?: string;
}) {
  const supabase = await createClient();
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const ratingFilter = ratingParam ? parseInt(ratingParam, 10) : null;
  const hasCommentFilter = hasCommentParam === 'true';

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("Feedback")
    .select("id, from_user, rating, comment", { count: 'exact' });

  if (ratingFilter && ratingFilter >= 1 && ratingFilter <= 5) {
    query = query.eq('rating', ratingFilter);
  }

  if (hasCommentFilter) {
    query = query.not('comment', 'is', null).neq('comment', '');
  }

  const { data: feedback, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching feedback:", error);
    return (
      <div className="h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">Recent Feedback</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Could not load feedback.</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return (
    <div className="h-full flex flex-col">
      {/* Header with filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="w-full">
          <FeedbackFilter />
        </div>
      </div>

      {/* Content area */}
      {!feedback || feedback.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">No feedback found for the selected filters.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Feedback list */}
          <div className="flex-1 space-y-3 mb-4">
            {feedback.map((item) => (
              <Card key={item.id} className="border border-border/50 hover:border-border transition-colors">
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center pt-2">
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
