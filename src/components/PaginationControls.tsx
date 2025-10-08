"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "./ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  className?: string;
}

const range = (start: number, end: number) => {
  let length = end - start + 1;
  return Array.from({ length }, (_, idx) => idx + start);
};

export const PaginationControls = ({ currentPage, totalPages, hasNextPage, hasPrevPage, className }: PaginationControlsProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const getPaginationRange = (): (string | number)[] => {
    const siblingCount = 1;
    const totalPageNumbers = siblingCount + 5;

    if (totalPageNumbers >= totalPages) {
      return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(
      currentPage + siblingCount,
      totalPages
    );

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = range(1, leftItemCount);
      return [...leftRange, "...", totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      let rightRange = range(totalPages - rightItemCount + 1, totalPages);
      return [1, "...", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [1, "...", ...middleRange, "...", totalPages];
    }
    return [];
  };

  const paginationRange = getPaginationRange();

  return (
    <div className={cn("flex items-center justify-end gap-1 mt-4", className)}>
      <Button asChild variant="outline" size="icon" disabled={!hasPrevPage} className="size-8">
        <Link href={createPageURL(currentPage - 1)}>
          <ChevronLeft className="size-4" />
        </Link>
      </Button>
      {paginationRange.map((pageNumber, index) =>
        typeof pageNumber === "number" ? (
          <Button key={index} asChild variant={currentPage === pageNumber ? "default" : "outline"} size="icon" className="size-8">
            <Link href={createPageURL(pageNumber)}>{pageNumber}</Link>
          </Button>
        ) : (
          <span key={`ellipsis-${index}`} className="flex h-8 w-8 items-center justify-center">
            <MoreHorizontal className="h-4 w-4" />
          </span>
        )
      )}
      <Button asChild variant="outline" size="icon" disabled={!hasNextPage} className="size-8">
        <Link href={createPageURL(currentPage + 1)}>
          <ChevronRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
};
