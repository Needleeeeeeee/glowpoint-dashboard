"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  addDays,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
  subMonths,
  subQuarters,
  subYears,
} from "date-fns";
import { DateRange } from "react-day-picker";
import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
const presets = [
  { label: "Today", range: { from: startOfDay(new Date()), to: new Date() } },
  {
    label: "Last 7 days",
    range: { from: startOfDay(subDays(new Date(), 6)), to: new Date() },
  },
  {
    label: "Last 30 days",
    range: { from: startOfDay(subDays(new Date(), 29)), to: new Date() },
  },
  {
    label: "Last 60 days",
    range: { from: startOfDay(subDays(new Date(), 59)), to: new Date() },
  },
  {
    label: "This Month",
    range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
  },
  {
    label: "Last Month",
    range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) },
  },
  {
    label: "This Quarter",
    range: { from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) },
  },
  {
    label: "Last Quarter",
    range: { from: startOfQuarter(subQuarters(new Date(), 1)), to: endOfQuarter(subQuarters(new Date(), 1)) },
  },
  {
    label: "This Year",
    range: { from: startOfYear(new Date()), to: endOfYear(new Date()) },
  },
  {
    label: "Last Year",
    range: { from: startOfYear(subYears(new Date(), 1)), to: endOfYear(subYears(new Date(), 1)) },
  },
];
export function DateRangeFilter({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: fromParam ? new Date(fromParam) : new Date(),
    to: toParam ? new Date(toParam) : addDays(new Date(),+30),
  });

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    if (range?.from && range?.to) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", format(startOfDay(range.from), "yyyy-MM-dd"));
      params.set("to", format(startOfDay(range.to), "yyyy-MM-dd"));
      router.push(`/home?${params.toString()}`);
      setPopoverOpen(false);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex items-start">
            <div className="flex flex-col items-start gap-1 p-3 border-r border-border">
              <div className="px-2 py-1.5 text-sm font-medium">Presets</div>
              {presets.map(({ label, range }) => (
                <Button
                  key={label}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleSelect(range)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleSelect}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
