"use client";

import { updatePaymentStatus, claimAppointment, unclaimAppointment } from "@/actions";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransition, useState } from "react";
import { toast } from "sonner";

export type Payment = {
  id: string;
  username: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  services: string[];
  amount: number;
  status: "pending" | "success" | "failed" | "assigned" | "verified";
  date_created: string;
  claimed_by_id?: string | null;
  claimed_by_username?: string | null;
  claimed_service?: string | null;
};

function ClaimDialog({ payment, userId, children }: { payment: Payment, userId: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleClaim = () => {
    if (!selectedService) {
      toast.error("Please select a service to claim.");
      return;
    }
    startTransition(async () => {
      const result = await claimAppointment(payment.id, userId, selectedService);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Appointment claimed successfully!");
        setIsOpen(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Claim Appointment for {payment.username}</DialogTitle>
          <DialogDescription>
            Select the service you will be performing for this appointment.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select onValueChange={setSelectedService} value={selectedService}>
            <SelectTrigger>
              <SelectValue placeholder="Select a service..." />
            </SelectTrigger>
            <SelectContent>
              {payment.services.map((service) => (
                <SelectItem key={service} value={service}>
                  {service}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleClaim} disabled={isPending || !selectedService}>
            {isPending ? "Claiming..." : "Claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Status update component for better state management
function StatusUpdateActions({ payment, isAdmin, userId }: { payment: Payment, isAdmin: boolean, userId: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(payment.status);

  const handleStatusUpdate = async (newStatus: "pending" | "success" | "failed") => {
    console.log("Payment object:", {
      id: payment.id,
      currentStatus: payment.status,
      newStatus,
      idType: typeof payment.id
    });

    if (currentStatus === newStatus) {
      toast.info(`Status is already "${newStatus}"`);
      return;
    }

    startTransition(async () => {
      try {
        console.log(`Calling updatePaymentStatus with ID: "${payment.id}" (${typeof payment.id}) and status: "${newStatus}"`);

        const result = await updatePaymentStatus(payment.id, newStatus);

        console.log("Update result:", result);

        if (result?.error) {
          console.error("Server returned error:", result.error);
          toast.error(result.error);
        } else if (result?.success) {
          console.log("Update successful:", result.success);
          setCurrentStatus(newStatus); // Update local state
          toast.success(result.success);
        } else {
          console.warn("Unexpected result format:", result);
          toast.error("Unexpected response from server");
        }
      } catch (error) {
        console.error("Client-side error during update:", error);
        toast.error(`Update failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });
  };

  const handleUnclaim = () => {
    startTransition(async () => {
      const result = await unclaimAppointment(payment.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Appointment unclaimed successfully!");
        setCurrentStatus("pending"); // Optimistically update status
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-300";
      case "success": return "bg-green-500/20 text-green-700 dark:text-green-300 border-green-300";
      case "failed": return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-300";
      case "assigned": return "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300";
      case "verified": return "bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-300";
      default: return "bg-gray-500/20 text-gray-800 dark:text-gray-300 border-gray-300";
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Status display */}
      <div className={cn(
        "px-2 py-1 rounded-md text-xs font-medium border text-center min-w-[80px]",
        getStatusColor(currentStatus)
      )}>
        {currentStatus === 'assigned' && payment.claimed_by_username
          ? `Assigned to ${payment.claimed_by_username}`
          : currentStatus
        }
      </div>

      {/* Actions dropdown */}
      {(isAdmin || (userId && (payment.status === 'verified' || payment.status === 'assigned'))) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>

            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(payment.username);
                toast.success("Payment ID copied to clipboard");
              }}
            >
              Copy Name
            </DropdownMenuItem>


            <DropdownMenuSeparator />

            {isAdmin && (
              <>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={isPending}>
                    {isPending ? "Updating..." : "Change Status"}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {currentStatus !== "verified" && currentStatus !== "assigned" && (
                        <DropdownMenuItem
                          disabled={isPending || currentStatus === "pending"}
                          onClick={() => handleStatusUpdate("pending")}
                          className="flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          Pending
                          {currentStatus === "pending" && <span className="text-xs text-muted-foreground">(current)</span>}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        disabled={isPending || currentStatus === "success"}
                        onClick={() => handleStatusUpdate("success")}
                        className="flex items-center gap-2"
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Success
                        {currentStatus === "success" && <span className="text-xs text-muted-foreground">(current)</span>}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={isPending || currentStatus === "failed"}
                        onClick={() => handleStatusUpdate("failed")}
                        className="flex items-center gap-2"
                      >
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Failed
                        {currentStatus === "failed" && <span className="text-xs text-muted-foreground">(current)</span>}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                {payment.status === 'assigned' && (
                  <DropdownMenuItem onSelect={handleUnclaim} disabled={isPending}>Unclaim Appointment</DropdownMenuItem>
                )}
              </>
            )}
            {!isAdmin && userId && payment.status === 'verified' ? (
              <ClaimDialog payment={payment} userId={userId}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Claim Appointment
                </DropdownMenuItem>
              </ClaimDialog>
            ) : !isAdmin && userId && payment.status === 'assigned' && payment.claimed_by_id === userId ? (
              <DropdownMenuItem onSelect={handleUnclaim} disabled={isPending}>
                Unclaim Appointment
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function ServicesCell({ services }: { services: string[] | null }) {
  if (!services || services.length === 0) {
    return <span className="text-muted-foreground">No services</span>;
  }

  const displayService = services[0];
  const remainingCount = services.length - 1;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start text-left font-normal p-0 h-auto hover:bg-transparent"
        >
          <div className="truncate max-w-[200px]">
            <span>{displayService}</span>
            {remainingCount > 0 && (
              <span className="text-muted-foreground ml-1">
                +{remainingCount} more
              </span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-xs p-4" align="start">
        <div className="flex flex-col gap-2">
          <h4 className="font-semibold text-sm">Services ({services.length})</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {services.map((service, index) => (
              <li key={index}><span className="text-foreground">{service}</span></li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const getColumns = (isAdmin: boolean, userId: string | null): ColumnDef<Payment>[] => {
  const columns: ColumnDef<Payment>[] = [];

  if (isAdmin) {
    columns.push({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          checked={row.getIsSelected()}
        />
      ),
    });
  }

  columns.push({
    accessorKey: "username",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  }, {
    accessorKey: "email",
    header: "Email"
  }, {
    accessorKey: "phone",
    header: "Phone",
  }, {
    accessorKey: "date",
    header: "Date",
  }, {
    accessorKey: "time",
    header: "Time",
  }, {
    accessorKey: "status",
    header: ({ column }) => {
      const statuses: Payment['status'][] = [
        "pending",
        "verified",
        "assigned",
        "success",
        "failed",
      ];
      const currentStatus = column.getFilterValue() as string | undefined;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-0 hover:bg-transparent">
              Status & Actions
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator/>
            <DropdownMenuRadioGroup
              value={currentStatus}
              onValueChange={(value) => {
                column.setFilterValue(value === "all" ? undefined : value);
              }}
            >
              <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
              {statuses.map((status) => (
                <DropdownMenuRadioItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    cell: ({ row }) => {
      const payment = row.original;
      return <StatusUpdateActions payment={payment} isAdmin={isAdmin} userId={userId} />;
    },
  }, {
    accessorKey: "services",
    header: "Services",
    cell: ({ row }) => {
      const { services } = row.original;
      return <ServicesCell services={services} />;
    },
  }, {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const formatted = new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
      }).format(amount);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  }, {
    accessorKey: "date_created",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  });

  return columns;
};
