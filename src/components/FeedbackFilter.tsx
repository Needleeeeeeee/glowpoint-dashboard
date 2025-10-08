"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Star } from "lucide-react";

export function FeedbackFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentRating = searchParams.get('rating');
    const hasComment = searchParams.get('has_comment') === 'true';

    const handleFilterChange = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === null) {
            params.delete(key);
        } else {
            params.set(key, value);
        }
        params.set('page', '1'); // Reset pagination on filter change
        router.push(`/home?${params.toString()}`);
    };

    return (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
            {/* Has Comment Switch */}
            <div className="flex items-center space-x-2">
                <Switch
                    id="has-comment-switch"
                    checked={hasComment}
                    onCheckedChange={(checked) => handleFilterChange('has_comment', checked ? 'true' : null)}
                    className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="has-comment-switch" className="text-sm font-medium cursor-pointer">
                    Has Comment
                </Label>
            </div>

            {/* Rating Filter */}
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Rating:</span>
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                        <Button
                            key={star}
                            variant={currentRating === String(star) ? 'default' : 'outline'}
                            size="sm"
                            className={`h-8 px-2 text-xs font-medium transition-colors ${
                                currentRating === String(star)
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    : 'border-border hover:bg-accent hover:text-accent-foreground'
                            }`}
                            onClick={() => handleFilterChange('rating', currentRating === String(star) ? null : String(star))}
                        >
                            <span className="mr-1">{star}</span>
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}
