"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  CheckCircle,
  Mail,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { verifyAppointment as verifyAppointmentAction } from "@/actions";

interface Appointment {
  id: string;
  Name: string;
  Email: string;
  Date: string;
  Time: string;
  Services: any;
  Total: number;
  status: string;
  payment_id: string;
  date_created: string;
  Phone: string;
}

export function AppointmentVerification({
  initialAppointments,
}: {
  initialAppointments: Appointment[];
}) {
  const [appointments, setAppointments] =
    useState<Appointment[]>(initialAppointments);
  const [isPending, startTransition] = useTransition();
  const [verifying, setVerifying] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const supabase = createClient();

  // Function to normalize services data
  const normalizeServices = (services: any): string[] => {
    if (!services) return [];

    if (Array.isArray(services)) {
      return services.filter((service) => service && service.trim() !== "");
    }

    if (typeof services === "string") {
      try {
        // Try to parse as JSON array
        const parsed = JSON.parse(services);
        return Array.isArray(parsed)
          ? parsed.filter((s: string) => s && s.trim() !== "")
          : [services];
      } catch {
        // If it's not JSON, handle PostgreSQL array format or comma-separated
        if (services.startsWith("(") && services.endsWith(")")) {
          // PostgreSQL array format: ("service1", "service2")
          const cleaned = services.slice(1, -1).replace(/"/g, "");
          return cleaned
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s !== "");
        }
        // Comma-separated string
        return services
          .split(",")
          .map((s: string) => s.trim())
          .filter((s) => s !== "");
      }
    }

    return [];
  };

  const fetchAppointments = useCallback(async () => {
    startTransition(async () => {
      try {
        const { data, error } = await supabase
          .from("Appointments")
          .select("*")
          .eq("status", "pending")
          .order("date_created", { ascending: sortOrder === "asc" })
          .limit(50);

        if (error) throw error;

        // Normalize services data for all appointments
        const normalizedAppointments = (data || []).map((appointment) => ({
          ...appointment,
          Services: normalizeServices(appointment.Services),
        }));

        setAppointments(normalizedAppointments);
      } catch (error) {
        console.error("Error fetching appointments:", error);
        toast.error("Failed to load appointments");
      }
    });
  }, [supabase, sortOrder]);

  useEffect(() => {
    fetchAppointments();
    const subscription = supabase
      .channel("appointments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Appointments",
          filter: "status=eq.pending",
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    // Set up an interval for auto-refresh every 10 seconds as a fallback
    const interval = setInterval(() => {
      fetchAppointments();
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [fetchAppointments, supabase]);

  const sendConfirmationEmail = async (appointment: Appointment) => {
    try {
      const response = await fetch("/api/send-transaction-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailType: "confirmation",
          appointment: {
            id: appointment.id,
            Name: appointment.Name,
            Email: appointment.Email,
            Date: appointment.Date,
            Time: appointment.Time,
            Services: appointment.Services,
            Total: appointment.Total,
            Phone: appointment.Phone,
          },
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response was not JSON");
      }

      return await response.json();
    } catch (error) {
      console.error("Email sending error:", error);

      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          throw new Error(
            "Network error: Could not reach the server. Please check your connection."
          );
        }
        if (error.message.includes("HTTP error! status: 404")) {
          throw new Error("Server endpoint not found. Please contact support.");
        }
        if (error.message.includes("HTTP error! status: 500")) {
          throw new Error("Server error. Please try again later.");
        }
      }

      throw error;
    }
  };

  const verifyAppointment = async (appointmentId: string) => {
    setVerifying(appointmentId);
    startTransition(async () => {
      const result = await verifyAppointmentAction(appointmentId);
      if (result.success) {
        toast.success(result.success);
        // Remove the verified appointment from the local state
        setAppointments((prev) =>
          prev.filter((app) => app.id !== appointmentId)
        );
      } else if (result.error) {
        toast.error("Verification Failed", { description: result.error });
      }
      setVerifying(null);
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "N/A";
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", variant: "secondary" as const },
      success: { label: "Success", variant: "default" as const },
      verified: { label: "Verified", variant: "default" as const },
      failed: { label: "Failed", variant: "destructive" as const },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const ServicesPopover = ({
    services,
    appointmentId,
  }: {
    services: string[];
    appointmentId: string;
  }) => {
    const normalizedServices = normalizeServices(services);

    if (normalizedServices.length === 0) {
      return <span className="text-muted-foreground text-sm">No services</span>;
    }

    const displayServices = normalizedServices.slice(0, 2);
    const hasMore = normalizedServices.length > 2;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 hover:bg-transparent text-left justify-start"
          >
            <div className="text-left max-w-full">
              <div className="text-sm line-clamp-2 break-words">
                {displayServices.join(", ")}
                {hasMore && "..."}
              </div>
              {hasMore && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  <MoreHorizontal className="h-3 w-3 mr-1" />
                  View all {normalizedServices.length} services
                </div>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">
              Services ({normalizedServices.length})
            </h4>
            <ul className="space-y-1 max-h-60 overflow-y-auto">
              {normalizedServices.map((service, index) => (
                <li
                  key={index}
                  className="text-sm py-1 border-b border-gray-100 last:border-b-0"
                >
                  {service}
                </li>
              ))}
            </ul>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <>
      <CardHeader>
        <CardTitle className="text-lg mb-2">Appointment Verification</CardTitle>
        <CardDescription className="text-sm mb-2">
          Verify pending appointments and send confirmation emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2">
        {/* Mobile Cards View */}
        <div className="block md:hidden space-y-3 max-h-[350px] overflow-y-auto">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="p-3">
              <div className="space-y-2">
                {/* Customer Info */}
                <div>
                  <div className="font-medium text-sm">
                    {appointment.Name || "N/A"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {appointment.Email || "No email"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {appointment.Phone || "No phone"}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="flex justify-between text-sm">
                  <span>{formatDate(appointment.Date)}</span>
                  <span>{formatTime(appointment.Time)}</span>
                </div>

                {/* Services */}
                <div>
                  <div className="text-xs font-medium mb-1">Services:</div>
                  <ServicesPopover
                    services={appointment.Services}
                    appointmentId={appointment.id}
                  />
                </div>

                {/* Payment ID */}
                <div>
                  <div className="text-xs font-medium mb-1">Payment ID:</div>
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                    {appointment.payment_id || "N/A"}
                  </code>
                </div>

                {/* Status & Actions */}
                <div className="flex justify-between items-center pt-2">
                  {getStatusBadge(appointment.status)}
                  {appointment.status === "pending" && (
                    <Button
                      onClick={() => verifyAppointment(appointment.id)}
                      disabled={verifying === appointment.id}
                      size="sm"
                      className="h-7 text-xs"
                    >
                      {verifying === appointment.id ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-1 h-3 w-3" />
                          Verify
                        </>
                      )}
                    </Button>
                  )}
                  {appointment.status === "success" && (
                    <div className="flex items-center text-green-600 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {!isPending && appointments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                No pending appointments found.
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                New pending appointments will appear here automatically.
              </p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-auto max-h-[350px]">
          <div className="min-w-[800px]">
            <Table className="w-full">
              <TableHeader className="sticky top-0 bg-muted/50 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 px-3 w-[180px]">Customer</TableHead>
                  <TableHead className="h-8 px-3 w-[150px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() =>
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                      }
                    >
                      Date & Time
                      {sortOrder === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="h-8 px-3 w-[220px]">Services</TableHead>
                  <TableHead className="h-8 px-3 w-[120px]">
                    Payment ID
                  </TableHead>
                  <TableHead className="h-8 px-3 w-[100px]">Status</TableHead>
                  <TableHead className="h-8 px-3 w-[140px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow
                    key={appointment.id}
                    className="h-12 hover:bg-muted/30"
                  >
                    <TableCell className="px-3 py-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {appointment.Name || "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {appointment.Email || "No email"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {appointment.Phone || "No phone"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="text-sm whitespace-nowrap">
                        {formatDate(appointment.Date)}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(appointment.Time)}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <ServicesPopover
                        services={appointment.Services}
                        appointmentId={appointment.id}
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded whitespace-nowrap block truncate max-w-[100px]">
                        {appointment.payment_id || "N/A"}
                      </code>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      {getStatusBadge(appointment.status)}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      {appointment.status === "pending" && (
                        <Button
                          onClick={() => verifyAppointment(appointment.id)}
                          disabled={verifying === appointment.id}
                          size="sm"
                          className="h-7 text-xs"
                        >
                          {verifying === appointment.id ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <Mail className="mr-1 h-3 w-3" />
                              Verify & Send
                            </>
                          )}
                        </Button>
                      )}
                      {appointment.status === "success" && (
                        <div className="flex items-center justify-end text-green-600 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {isPending && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isPending && appointments.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">
                  No pending appointments found.
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  New pending appointments will appear here automatically.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </>
  );
}
