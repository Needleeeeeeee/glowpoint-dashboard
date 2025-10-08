"use client";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { parseISO, isSameDay, format, addMonths, subMonths } from "date-fns";
import { AppointmentDetailsCard } from "./AppointmentDetailsCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Appointment {
  id: string;
  Date: string; // ISO date string
  Time: string;
  Services: string | string[]; // JSON string array or array of strings
  Name: string;
  claimed_by_username?: string | null;
  claimed_service?: string | null;
}

interface CalendarViewProps {
  appointments: Appointment[];
}

export function CalendarView({ appointments }: CalendarViewProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState(new Date());

  const { daysWithAppointments, appointmentCounts } = useMemo(() => {
    const daysMap = new Map<string, { date: Date; count: number }>();

    appointments.forEach((app) => {
      const appDate = parseISO(app.Date);
      const dateKey = appDate.toISOString().split('T')[0];

      if (daysMap.has(dateKey)) {
        daysMap.get(dateKey)!.count += 1;
      } else {
        daysMap.set(dateKey, { date: appDate, count: 1 });
      }
    });

    return {
      daysWithAppointments: Array.from(daysMap.values()).map(item => item.date),
      appointmentCounts: daysMap
    };
  }, [appointments]);

  // Get appointment count for a specific day
  const getAppointmentCountForDay = (day: Date | undefined) => {
    if (!day) return 0;
    const dateKey = day.toISOString().split('T')[0];
    return appointmentCounts.get(dateKey)?.count || 0;
  };

  const handlePrevMonth = () => {
    setMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setMonth((prev) => addMonths(prev, 1));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-3/5 rounded-md border bg-card w-full flex flex-col">
            <div className="p-4 flex items-center justify-between border-b">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-bold text-center flex-1">{format(month, "MMMM yyyy")}</h2>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                month={month}
                onMonthChange={setMonth}
                className="w-full"
                numberOfMonths={1}
                showOutsideDays={true}
                fixedWeeks={true}
                modifiers={{
                  hasAppointment: daysWithAppointments,
                }}
                modifiersClassNames={{
                  hasAppointment: "bg-gradient-to-br from-rose-300 to-amber-300 text-gray-800 font-semibold hover:from-rose-400 hover:to-amber-400 scale-90 hover:scale-100 transition-all duration-200 relative",
                }}
                formatters={{
                  formatDay: (day) => {
                    const count = getAppointmentCountForDay(day);
                    if (count > 0) {
                      return (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <span className="text-xs sm:text-base font-semibold">{day.getDate()}</span>
                          <div className="absolute top-0 right-0 bg-rose-500 text-white text-xs rounded-full min-w-3 h-3 sm:min-w-5 sm:h-5 flex items-center justify-center font-bold shadow-lg border border-white sm:border-2 z-10 transform translate-x-1 sm:translate-x-2 -translate-y-1 sm:-translate-y-2">
                            {count}
                          </div>
                        </div>
                      );
                    }
                    return <span className="text-xs sm:text-base">{day.getDate()}</span>;
                  }
                }}
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-6 sm:space-y-0 justify-between flex-1 p-2 sm:p-4",
                  month: "space-y-4 sm:space-y-6 flex-1 flex flex-col items-center justify-center",
                  caption: "hidden",
                  caption_label: "hidden",
                  nav: "hidden",
                  nav_button: "hidden",
                  nav_button_previous: "hidden",
                  nav_button_next: "hidden",
                  table: "w-full border-collapse space-y-1 sm:space-y-2",
                  head_row: "flex mb-1 sm:mb-2",
                  head_cell: "text-muted-foreground rounded-md w-full font-medium sm:font-semibold text-xs sm:text-base py-1 sm:py-3",
                  row: "flex w-full mt-1 sm:mt-2",
                  cell: "relative text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:rounded-lg w-full h-10 sm:h-16 flex items-center justify-center",
                  day: "size-8 sm:size-14 p-0 font-normal aria-selected:opacity-100 rounded-md sm:rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-center relative text-xs sm:text-base",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground font-bold ring-1 sm:ring-2 ring-primary ring-offset-1 sm:ring-offset-2",
                  day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
              />
            </div>
          </div>

          <div className="lg:w-2/5 w-full">
            <AppointmentDetailsCard
              selectedDate={date}
              appointments={appointments}
            />
          </div>
    </div>
  );
}
