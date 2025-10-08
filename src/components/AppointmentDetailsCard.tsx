"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, parse, parseISO } from "date-fns";
import type { Appointment } from "./CalendarView";
import { Calendar, Clock, User, WandSparkles } from "lucide-react";

interface AppointmentDetailsCardProps {
  selectedDate: Date | undefined;
  appointments: Appointment[];
}

const parseServices = (servicesData: string | string[]): string[] => {
  if (Array.isArray(servicesData)) {
    return servicesData;
  }
  try {
    const parsed = JSON.parse(servicesData);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === "string");
    }
  } catch (e) {
    if (typeof servicesData === 'string' && servicesData.trim().length > 0) {
      return [servicesData];
    }
  }
  return [];
};

export function AppointmentDetailsCard({ selectedDate, appointments }: AppointmentDetailsCardProps) {
  const appointmentsForSelectedDay = selectedDate
    ? appointments
        .filter((app) => isSameDay(parseISO(app.Date), selectedDate))
        .sort((a, b) => a.Time.localeCompare(b.Time))
    : [];

  return (
    <Card className="rounded-md border shadow-none overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-6 px-6 pt-6 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-6 w-6 text-primary flex-shrink-0" />
          <CardTitle className="text-2xl truncate">
            {selectedDate ? `${format(selectedDate, "EEEE")}` : "Select a date"}
          </CardTitle>
        </div>
        {selectedDate && (
          <p className="text-base text-muted-foreground font-medium ml-9 truncate">
            {format(selectedDate, "MMMM dd, yyyy")}
          </p>
        )}
        {appointmentsForSelectedDay.length > 0 && (
          <div className="flex items-center gap-2 mt-4 ml-9">
            <Badge variant="secondary" className="text-sm px-3 py-1 flex-shrink-0">
              {appointmentsForSelectedDay.length} appointment{appointmentsForSelectedDay.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0 px-6 pb-6 flex-grow overflow-y-auto">
        {!selectedDate ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center space-y-4">
              <Calendar className="h-16 w-16 text-muted-foreground/50 mx-auto flex-shrink-0" />
              <p className="text-muted-foreground text-lg">Select a day to see appointments</p>
            </div>
          </div>
        ) : appointmentsForSelectedDay.length === 0 ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center space-y-4">
              <Clock className="h-16 w-16 text-muted-foreground/50 mx-auto flex-shrink-0" />
              <p className="text-muted-foreground text-lg">No appointments for this day</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
              {appointmentsForSelectedDay.map((app) => (
                <div
                  key={app.id}
                  className="p-5 border rounded-xl bg-gradient-to-r from-card to-muted/30 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-primary"
                >
                  <div className="flex flex-wrap justify-between items-start gap-x-4 gap-y-2 mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                      <User className="h-5 w-5 text-primary flex-shrink-0" />
                      <p className="font-semibold text-lg truncate">{app.Name || "Walk-in"}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full flex-shrink-0">
                      <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                      <p className="text-base font-medium text-primary whitespace-nowrap">
                        {format(parse(app.Time, "HH:mm:ss", new Date()), "h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {parseServices(app.Services).map((service, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="font-normal text-sm bg-secondary/70 hover:bg-secondary transition-colors px-3 py-1 flex-shrink-0"
                      >
                        {service}
                      </Badge>
                    ))}
                  </div>
                  {app.claimed_by_username && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>
                          Claimed by <span className="font-semibold text-foreground">{app.claimed_by_username}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <WandSparkles className="h-4 w-4" />
                        <span>Service: <span className="font-semibold text-foreground">{app.claimed_service}</span></span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
